"""Lossless journal normalization and atomic event archival for persistent worlds.

Game facts, actor state, request identities and the existing canonical limits stay
unchanged. Historical event payloads use the store's existing hash-verified archive.
"""
import base64
from copy import deepcopy
import hashlib
import json
import time
import zlib

MAX_RESULT_BYTES = 4 * 1024 * 1024
RECENT_EVENT_NODES = 8192
RECENT_EVENT_COUNT = 48


def canonical_json(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)


def normalize_fingerprint(fingerprint):
    if not isinstance(fingerprint, list):
        return fingerprint
    # Engine fingerprints have eight fields. Field 5 was the entire resolution.
    # A content hash preserves exact collision semantics without retaining every
    # historical copy of a character/world in the live state document.
    if len(fingerprint) == 8 and isinstance(fingerprint[5], dict):
        from .state import _validate_canonical_value
        _validate_canonical_value(fingerprint[5])
        out = deepcopy(fingerprint)
        out[5] = ['barbara.resolution.sha256/v1', hashlib.sha256(canonical_json(fingerprint[5]).encode()).hexdigest()]
        return out
    return fingerprint


def compact_request_journal(journal):
    if not isinstance(journal, dict):
        return
    from .state import _validate_canonical_value
    for entry in journal.values():
        if not isinstance(entry, dict) or set(entry) != {'fingerprint', 'result'}:
            continue  # The normal validator rejects malformed entries.
        entry['fingerprint'] = normalize_fingerprint(entry['fingerprint'])
        result = entry['result']
        if not isinstance(result, dict) or '_compressed_result' in result:
            continue
        _validate_canonical_value(result)
        raw = canonical_json(result).encode()
        if 2048 < len(raw) <= MAX_RESULT_BYTES:
            entry['result'] = {
                '_compressed_result': base64.b64encode(zlib.compress(raw, 6)).decode('ascii'),
                '_result_sha256': hashlib.sha256(raw).hexdigest(),
                '_result_size': len(raw),
                '_tick': int(result.get('tick', 0)),
            }


def node_count(value):
    if isinstance(value, dict):
        return 1 + sum(node_count(v) for v in value.values())
    if isinstance(value, (list, tuple)):
        return 1 + sum(node_count(v) for v in value)
    return 1


def load_compacted(store, campaign_id):
    """Load old or new saves; archive history and update representation atomically.

    Storage compaction does not advance state_version, world time, RNG, rewards or
    game facts. The same SQLite write transaction owns archives and the new tail.
    """
    from .state import CampaignState, MAX_STATE_JSON_CHARS
    if not isinstance(campaign_id, str) or not campaign_id:
        raise ValueError('invalid_campaign_id')
    with store._lock:
        store._ensure_open()
        own_transaction = not store._db.in_transaction
        if own_transaction:
            store._db.execute('BEGIN IMMEDIATE')
        try:
            row = store._db.execute('SELECT state_json,state_version FROM campaigns WHERE campaign_id=?', (campaign_id,)).fetchone()
            if row is None:
                raise KeyError(campaign_id)
            if not isinstance(row[0], str) or len(row[0]) > MAX_STATE_JSON_CHARS:
                raise ValueError('invalid_state_json')
            document = json.loads(row[0])
            if not isinstance(document, dict):
                raise ValueError('invalid_state_document')
            events = document.get('event_log', [])
            if not isinstance(events, list):
                raise ValueError('invalid_event_log')
            # Validate each event before moving it out of the live document. This
            # cannot launder malformed values, duplicate IDs, cycles or non-finite numbers.
            ids = set()
            sizes = []
            for event in events:
                CampaignState(campaign_id=campaign_id, system_id=document.get('system_id', ''), event_log=[event]).validate()
                if event['event_id'] in ids:
                    raise ValueError('duplicate_event_id')
                ids.add(event['event_id'])
                sizes.append(node_count(event))
            count = 0
            total_nodes = 0
            for size in reversed(sizes):
                if count and (count >= RECENT_EVENT_COUNT or total_nodes + size > RECENT_EVENT_NODES):
                    break
                count += 1
                total_nodes += size
            cut = len(events) - count
            archived = events[:cut]
            document['event_log'] = events[cut:]
            # This normalizes old journal entries before the global node-count gate.
            state = CampaignState.from_dict(document)
            encoded = state.to_json()
            if archived:
                seq = store._db.execute('SELECT COALESCE(MAX(seq),-1)+1 FROM event_archives WHERE campaign_id=?', (campaign_id,)).fetchone()[0]
                for start in range(0, len(archived), 100):
                    block = archived[start:start + 100]
                    payload = zlib.compress(canonical_json(block).encode(), 6)
                    store._db.execute('INSERT INTO event_archives(campaign_id,seq,event_count,sha256,payload,created_at) VALUES(?,?,?,?,?,?)', (campaign_id, seq, len(block), hashlib.sha256(payload).hexdigest(), payload, int(time.time() * 1000)))
                    seq += 1
            if encoded != row[0]:
                store._db.execute('UPDATE campaigns SET state_json=? WHERE campaign_id=? AND state_version=?', (encoded, campaign_id, row[1]))
            if own_transaction:
                store._db.execute('COMMIT')
            return state
        except Exception:
            if own_transaction and store._db.in_transaction:
                store._db.execute('ROLLBACK')
            raise
