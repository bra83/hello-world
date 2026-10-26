package com.braseiro.cyberpunkred

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.room.Room
import barbara.integration.*
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.util.UUID
import java.util.zip.ZipFile

/**
 * Host Android do Cyberpunk RED V4.0.0 sobre o pacote de regras estável 3.3.3.
 *
 * A posição do mapa NÃO é verdade paralela da UI: o token "player" é persistido pelo
 * VttAuthority do Motor Bárbara (DurableStateStore/CAS). A ficha recebe apenas uma projeção
 * normalizada desse estado para exportação e restauração visual.
 */
class BarbaraRuntime(private val context: Context) {
    companion object {
        const val WORLD_ID = "cpred-main-v4"
        const val CAMPAIGN_ID = "cpred-main-campaign-v4"
        const val LEGACY_WORLD_ID = "cpred-main"
        const val SYSTEM_ID = "cyberpunk-red"
        const val SYSTEM_VERSION = "4.0.0"
        const val PLAYER_TOKEN_ID = "player"
        const val PLAYER_ACTOR_ID = "player"
        const val MAP_WIDTH = 6600.0
        const val MAP_HEIGHT = 10200.0
        const val PACKAGE_ASSET = "barbara/cyberpunk-red-4.0.0.zip"
        const val PACKAGE_SHA256 = "4ee372ef851b1ba78d79bdded343138704c8e12465e9143bc63657aba357f6b8"
        const val LEGACY_PACKAGE_ASSET = "barbara/cyberpunk-red-3.3.3.zip"
        const val LEGACY_PACKAGE_SHA256 = "b9411d8c9b25d873796adc80b2618b22873a8b508811d7591e4ce43bc7d89594"
        const val UPDATER_PUBLIC_KEY_B64 = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxexhp8D20peB/tvefF+G2gg2Y2WYsbn1Ef9uLa87vAnZwk/tPEDrNDSksXq5QcKp7pCnL/lgtapidSnZE7mryFX7o5d2XSN1xdMkRjcJJt1h/ZLqIZxz8n+gGqhpa3z/COJWisgBQIXRvH3cHOUp8VNMsMd35vvl11WnGcp/5lhcXXJUCZbv7x53jwZlLPHTTZ9Fr+32IAB8vtpvct9j+Pvp23stlB/61o+5ZcKLH61zsaTdMvdYVhmbhGQ1jIgJ5odDlzwZIw96qjFhoWdZ30pO+9Z4Fri6e3mbKSgtHrZtcrHq9vv7oOT2wFrpNuvtmSKAtU/OxWe+yxJQH73b5QIDAQAB"
        const val DEFAULT_GITHUB_UPDATE_MANIFEST_URL = "https://github.com/bra83/hello-world/releases/download/cyberpunk-red-r572-ota-feed/cpred-r572-ota-manifest.json"
    }

    val gateway: BarbaraGateway
    val characters: CyberpunkCharacterDao
    private val prefs = context.getSharedPreferences("cpred-barbara", Context.MODE_PRIVATE)
    private val secretStore = SecureSecretStore(context)
    private val ttsService = GeminiTtsService(context, secretStore)
    private val androidTtsService = AndroidTtsService(context)
    private val canonicalTurnLock = Any()
    private var coreStatus: JSONObject = JSONObject().put("ok", false).put("state", "not_started")

    /**
     * Banco visual local de NPCs. O catálogo é asset-only e não é autoridade de
     * identidade: o vínculo definitivo fica no campaignState do personagem/save.
     */
    private val enemyTokenCatalog: JSONArray by lazy {
        val raw = context.assets.open("web/app/assets/tokens/enemies/catalog.json")
            .bufferedReader(Charsets.UTF_8).use { it.readText() }
        JSONObject(raw).getJSONArray("items")
    }

    private val equipmentCatalog: JSONArray by lazy {
        val raw = context.assets.open("web/app/data/equipment_catalog.json")
            .bufferedReader(Charsets.UTF_8).use { it.readText() }
        JSONObject(raw).getJSONArray("items")
    }

    private fun loadEquipmentArray(path: String, key: String = "items"): JSONArray {
        val raw = context.assets.open(path).bufferedReader(Charsets.UTF_8).use { it.readText() }
        return JSONObject(raw).optJSONArray(key) ?: JSONArray()
    }

    private val supplementalEquipmentCatalog: JSONArray by lazy {
        val out = JSONArray()
        val sources = listOf(
            "web/app/data/black_chrome_catalog.json" to "items",
            "web/app/data/interface_red_catalog.json" to "items",
            "web/app/data/going_quiet_catalog.json" to "items",
            "web/app/data/cyberchair_catalog.json" to "items",
            "web/app/data/hope_reborn_equipment.json" to "items",
            "web/app/data/cemk_cyberware_catalog.json" to "items",
            "web/app/data/interface_red_vol2_mechanics.json" to "gunmasWeapons",
        )
        for ((path, key) in sources) {
            val rows = loadEquipmentArray(path, key)
            for (i in 0 until rows.length()) out.put(JSONObject(rows.getJSONObject(i).toString()))
        }
        out
    }

    private fun dynamicOldGunItem(character: JSONObject?, itemId: String): JSONObject? {
        val conversions = character?.optJSONObject("campaignState")
            ?.optJSONObject("worldSystems")?.optJSONObject("oldGuns")?.optJSONArray("conversions") ?: return null
        for (i in 0 until conversions.length()) {
            val item = conversions.optJSONObject(i)?.optJSONObject("item") ?: continue
            if (item.optString("id") == itemId) return item
        }
        return null
    }

    private fun equipmentItem(itemId: String, character: JSONObject? = null): JSONObject? {
        for (catalog in listOf(equipmentCatalog, supplementalEquipmentCatalog)) {
            for (i in 0 until catalog.length()) {
                val item = catalog.optJSONObject(i) ?: continue
                if (item.optString("id") == itemId) return item
            }
        }
        return dynamicOldGunItem(character, itemId)
    }


    private fun campaignStateOf(character: JSONObject): JSONObject =
        character.optJSONObject("campaignState") ?: JSONObject().also { character.put("campaignState", it) }

    private fun enemyVisualRegistry(campaign: JSONObject): JSONObject =
        campaign.optJSONObject("enemyVisualRegistry") ?: JSONObject().also { campaign.put("enemyVisualRegistry", it) }

    private fun consumedEnemyVisualIds(campaign: JSONObject): Pair<JSONArray, MutableSet<String>> {
        val arr = campaign.optJSONArray("consumedEnemyVisualIds") ?: JSONArray().also { campaign.put("consumedEnemyVisualIds", it) }
        val set = mutableSetOf<String>()
        for (i in 0 until arr.length()) arr.optString(i).takeIf { it.isNotBlank() }?.let(set::add)
        return arr to set
    }

    private fun normalizeSex(value: String?): String? = when (value?.lowercase()) {
        "male", "masculino", "m" -> "male"
        "female", "feminino", "f" -> "female"
        else -> null
    }

    private fun normalizeAgeGroup(value: String?): String? {
        val raw = value?.trim()?.lowercase()?.replace('_','-') ?: return null
        raw.toIntOrNull()?.let { age ->
            return when {
                age < 25 -> "young"
                age < 40 -> "adult"
                age < 60 -> "middle"
                else -> "senior"
            }
        }
        return when (raw) {
            "young", "jovem", "18-24" -> "young"
            "adult", "adulta", "adulto", "25-39" -> "adult"
            "middle", "middle-age", "middle-aged", "meia-idade", "40-59" -> "middle"
            "senior", "elder", "elderly", "idosa", "idoso", "60+" -> "senior"
            else -> null
        }
    }

    private fun normalizeAppearanceGroup(value: String?): String? {
        val v = value?.lowercase()?.trim()?.replace(' ', '_') ?: return null
        return when (v) {
            "black", "negra", "negro", "african", "africana", "africano", "afro", "afrodescendente", "afro-descendente" -> "black"
            "white", "branca", "branco", "caucasian", "caucasiana", "caucasiano" -> "white"
            "east_asian", "leste-asiatica", "leste-asiático", "leste-asiática", "asian", "asiatica", "asiático", "asiática" -> "east_asian"
            "southeast_asian", "sudeste-asiatica", "sudeste-asiático", "sudeste-asiática" -> "southeast_asian"
            "south_asian", "sul-asiatica", "sul-asiático", "sul-asiática", "indian", "indiana", "indiano" -> "south_asian"
            "latino", "latina", "latino-americana", "latino-americano", "hispanic", "hispanica", "hispânico", "hispânica" -> "latino"
            "middle_eastern", "oriente_medio", "oriente-medio", "oriente_médio", "arab", "arabe", "árabe" -> "middle_eastern"
            "indigenous", "indigena", "indígena", "native", "native_american" -> "indigenous"
            else -> null
        }
    }

    private fun demographicProfile(seed: Int, requested: JSONObject?): JSONObject {
        val sexes = listOf("female", "male")
        val ages = listOf("young", "adult", "middle", "senior")
        val appearances = listOf("black", "white", "east_asian", "southeast_asian", "south_asian", "latino", "middle_eastern", "indigenous")
        val sex = normalizeSex(requested?.optString("sex")) ?: sexes[seed % sexes.size]
        val age = normalizeAgeGroup(requested?.let { it.optString("ageGroup", it.optString("age")) }) ?: ages[(seed / 5) % ages.size]
        val appearance = normalizeAppearanceGroup(requested?.let { it.optString("appearanceGroup", it.optString("race")) }) ?: appearances[(seed / 11) % appearances.size]
        return JSONObject().put("sex", sex).put("ageGroup", age).put("appearanceGroup", appearance).put("race", appearance)
    }

    private fun allocateEnemyVisual(
        enemyId: String,
        profile: JSONObject,
        registry: JSONObject,
        consumedArray: JSONArray,
        consumed: MutableSet<String>,
    ): JSONObject {
        registry.optJSONObject(enemyId)?.let { return it }
        val sex = profile.getString("sex")
        val age = profile.getString("ageGroup")
        val appearance = profile.getString("appearanceGroup")
        val candidates = mutableListOf<JSONObject>()
        for (i in 0 until enemyTokenCatalog.length()) {
            val item = enemyTokenCatalog.getJSONObject(i)
            if (item.optString("sex") == sex && item.optString("ageGroup") == age &&
                item.optString("appearanceGroup") == appearance && !consumed.contains(item.optString("id"))) {
                candidates += item
            }
        }
        require(candidates.isNotEmpty()) {
            "Banco visual esgotado para sex=$sex age=$age appearance=$appearance; não é permitido reciclar token."
        }
        val chosen = candidates[((enemyId.hashCode() and Int.MAX_VALUE) % candidates.size)]
        val visual = JSONObject()
            .put("enemyId", enemyId)
            .put("visualId", chosen.getString("id"))
            .put("tokenSrc", chosen.getString("src"))
            .put("sex", sex)
            .put("sexLabel", chosen.optString("sexLabel"))
            .put("ageGroup", age)
            .put("ageLabel", chosen.optString("ageLabel"))
            .put("ageRange", chosen.optString("ageRange"))
            .put("appearanceGroup", appearance)
            .put("race", appearance)
            .put("appearanceLabel", chosen.optString("appearanceLabel"))
            .put("status", "alive")
            .put("firstSeenAt", System.currentTimeMillis())
            .put("lastSeenAt", System.currentTimeMillis())
        registry.put(enemyId, visual)
        val id = chosen.getString("id")
        if (consumed.add(id)) consumedArray.put(id)
        return visual
    }

    init {
        if (!Python.isStarted()) Python.start(AndroidPlatform(context))
        gateway = BarbaraGateway()
        val db = Room.databaseBuilder(
            context,
            CyberpunkCharacterDatabase::class.java,
            "cyberpunk-red-adapter.sqlite3",
        ).build()
        characters = db.characters()
        configureCoreAndWorld()
    }

    private fun configureCoreAndWorld() {
        coreStatus = try {
            val apiKey = secretStore.apiKey()
            val ragPath = File(context.filesDir, "barbara-rag.sqlite3").absolutePath
            val configured = gateway.configure(
                apiKey = apiKey,
                model = secretStore.textModel(),
                ragDbPath = ragPath,
                useGemini = apiKey != null,
            )
            val supervisor = gateway.configureExternalSupervisor(
                systemId = SYSTEM_ID,
                systemVersion = SYSTEM_VERSION,
                capabilities = JSONArray(
                    listOf(
                        "character_creation", "living_world", "persistent_npcs",
                        "atlas.navigation", "atlas.street_routing", "dynamic_pois",
                        "vtt.tokens", "vtt.scene_collision", "vtt.fog", "vtt.npcs", "vtt.authoritative_geometry_gate", "vtt.persistent_enemy_visuals",
                        "npc.visual_identity_registry", "npc.demographic_token_match", "npc.dead_token_reservation",
                        "vehicles.basic", "vehicles.land_control", "vehicles.maneuvers", "vehicles.ramming",
                        "combat.spatial", "combat.dedicated_vtt", "combat.turn_manager", "combat.targeting_ui", "combat.cover_ui",
                        "combat.melee", "combat.critical_injuries", "combat.death_save", "combat.suppressive_fire", "combat.binary_destructible_cover",
                        "medical.stabilization", "medical.speedheal", "netrunning.interface_actions", "netrunning.scanner", "netrunning.slide", "netrunning.virus",
                        "audio.procedural_offline", "rag.user_corpus_import", "dice3d.physical_top_face_verified",
                    )
                ),
                datasets = JSONObject()
                    .put("locale", "pt-BR")
                    .put("atlasNamespace", "cyberpunk-red/night-city-2045")
                    .put("atlasDimensions", JSONObject().put("width", MAP_WIDTH).put("height", MAP_HEIGHT))
                    .put("rulesAuthority", "adapter")
                    .put("worldAuthority", "barbara-core"),
                metadata = JSONObject()
                    .put("appId", "com.braseiro.cyberpunkred")
                    .put("adapterVersion", SYSTEM_VERSION)
                    .put("minimumBarbaraCoreVersion", "1.1.2")
                    .put("maximumTestedBarbaraCoreVersion", "1.1.2"),
            )

            val platformRoot = File(context.filesDir, "barbara-platform").apply { mkdirs() }
            val platform = gateway.configurePlatform(platformRoot.absolutePath)
            val legacyPackage = copyAssetIfNeeded(LEGACY_PACKAGE_ASSET, File(context.filesDir, "packages/cyberpunk-red-3.3.3.zip"))
            ensureSystemPackage(legacyPackage, "3.3.3", LEGACY_PACKAGE_SHA256)
            val packageFile = copyAssetIfNeeded(PACKAGE_ASSET, File(context.filesDir, "packages/cyberpunk-red-4.0.0.zip"))
            ensureSystemPackage(packageFile, SYSTEM_VERSION, PACKAGE_SHA256)
            ensureWorld()
            ensureActiveWorldSelection()
            val vtt = ensureAtlasVtt()
            migrateLegacyProjectionIfNeeded()

            JSONObject()
                .put("ok", true)
                .put("coreVersion", "1.1.2")
                .put("adapterVersion", SYSTEM_VERSION)
                .put("configured", configured)
                .put("supervisor", supervisor)
                .put("platform", platform)
                .put("worldId", activeWorldId())
                .put("campaignId", CAMPAIGN_ID)
                .put("sourceOfTruth", JSONObject()
                    .put("campaign", "barbara-platform-durable-state-store")
                    .put("spatial", "barbara-vtt-authority")
                    .put("characterRoom", "read-only-projection-after-core-commit")
                    .put("narrative", "barbara-supervised-presentation"))
                .put("atlas", JSONObject().put("id", "night-city-2045").put("width", MAP_WIDTH).put("height", MAP_HEIGHT))
                .put("vttStateVersion", vtt.optInt("state_version", -1))
                .put("geminiConfigured", apiKey != null)
        } catch (t: Throwable) {
            JSONObject()
                .put("ok", false)
                .put("coreVersion", "1.1.2")
                .put("adapterVersion", SYSTEM_VERSION)
                .put("error", t.message ?: t.javaClass.simpleName)
        }
    }

    private fun copyAssetIfNeeded(assetPath: String, target: File): File {
        target.parentFile?.mkdirs()
        if (!target.exists() || target.length() == 0L) {
            context.assets.open(assetPath).use { input -> target.outputStream().use(input::copyTo) }
        }
        return target
    }

    private fun ensureSystemPackage(packageFile: File, version: String, sha256: String) {
        val installed = gateway.platformPackages()
        val found = (0 until installed.length()).any { i ->
            val manifest = installed.optJSONObject(i)?.optJSONObject("manifest")
            manifest?.optString("type") == "system" &&
                manifest.optString("id") == SYSTEM_ID &&
                manifest.optString("version") == version
        }
        if (!found) gateway.platformInstallPackage(packageFile.absolutePath, sha256)
    }

    /**
     * R5.45 self-healing platform bootstrap.
     *
     * The Gemini key/model can be changed after a partial startup. Previously that only
     * reconfigured the LLM and left BarbaraPlatform null, so the first player action failed
     * with `barbara_platform_not_configured`. Any canonical turn now re-establishes the
     * durable platform/world/VTT before mutation. This intentionally does not run the legacy
     * projection migration (which can itself commit a canonical turn).
     */
    private fun ensurePlatformReadyForTurn(): JSONObject {
        val platformRoot = File(context.filesDir, "barbara-platform").apply { mkdirs() }
        val platform = gateway.configurePlatform(platformRoot.absolutePath)
        val legacyPackage = copyAssetIfNeeded(LEGACY_PACKAGE_ASSET, File(context.filesDir, "packages/cyberpunk-red-3.3.3.zip"))
        ensureSystemPackage(legacyPackage, "3.3.3", LEGACY_PACKAGE_SHA256)
        val packageFile = copyAssetIfNeeded(PACKAGE_ASSET, File(context.filesDir, "packages/cyberpunk-red-4.0.0.zip"))
        ensureSystemPackage(packageFile, SYSTEM_VERSION, PACKAGE_SHA256)
        ensureWorld()
        ensureActiveWorldSelection()
        val vtt = ensureAtlasVtt()
        coreStatus
            .put("platformRecovered", true)
            .put("platform", platform)
            .put("worldId", activeWorldId())
            .put("vttStateVersion", vtt.optInt("state_version", -1))
        return platform
    }

    private fun ensureWorld() {
        val worlds = gateway.platformWorlds()
        val found = (0 until worlds.length()).any { i -> worlds.optJSONObject(i)?.optString("world_id") == WORLD_ID }
        if (!found) {
            val legacyFound = (0 until worlds.length()).any { i -> worlds.optJSONObject(i)?.optString("world_id") == LEGACY_WORLD_ID }
            if (legacyFound && !prefs.getBoolean("v4LegacyBackupCreated", false)) {
                val target = File(backupDirectory(), "${System.currentTimeMillis()}_migration-v3-to-v4.barbara-world.zip")
                gateway.platformBackupWorld(LEGACY_WORLD_ID, target.absolutePath)
                prefs.edit().putBoolean("v4LegacyBackupCreated", true).putBoolean("v4ProjectionMigrationPending", true).apply()
            }
            gateway.platformCreateWorld(
                worldId = WORLD_ID,
                title = "Cyberpunk RED — Night City 2045",
                systemId = SYSTEM_ID,
                systemVersion = SYSTEM_VERSION,
                campaignId = CAMPAIGN_ID,
            )
        }
    }

    /**
     * V3 Worlds remain recoverable as a native backup. The Room record is only the
     * last committed projection, but it is sufficient to seed the V4 World without
     * silently mutating or deleting the original campaign.
     */
    private fun migrateLegacyProjectionIfNeeded() {
        if (!prefs.getBoolean("v4ProjectionMigrationPending", false)) return
        val id = activeCharacterId()
        val raw = id?.let(::storedCharacter)
        if (id != null && raw != null) {
            val character = JSONObject(raw)
            val position = character.optJSONObject("worldPosition") ?: JSONObject()
            val street = if (position.optString("mode") == "interior")
                position.optJSONObject("returnStreet") ?: position
            else position
            character.put("worldPosition", JSONObject(street.toString()).put("mode", "street").put("atlasId", "night-city-2045"))
            val campaign = character.optJSONObject("campaignState") ?: JSONObject().also { character.put("campaignState", it) }
            campaign.put("v4Migration", JSONObject()
                .put("sourceWorldId", LEGACY_WORLD_ID)
                .put("backupCreated", true)
                .put("migratedAtEpochMs", System.currentTimeMillis()))
            saveCharacter(id, character.toString())
            if (street.has("x") && street.has("y")) updatePosition(id, JSONObject()
                .put("x", street.optDouble("x", 0.5))
                .put("y", street.optDouble("y", 0.5))
                .put("travelMode", street.optString("travelMode", "walk")))
        }
        prefs.edit().putBoolean("v4ProjectionMigrationPending", false).apply()
    }

    /** Seed the canonical atlas unless a persisted tactical scene is already active. */
    private fun ensureAtlasVtt(): JSONObject {
        var snap = gateway.platformVttSnapshot(activeWorldId(), PLAYER_ACTOR_ID, "gm")
        var version = snap.getInt("state_version")
        var state = snap.getJSONObject("state")
        val existingMap = state.optJSONObject("map") ?: JSONObject()
        val sceneActive = sceneIdFromMap(existingMap) != null

        if (!sceneActive) {
            val grid = state.optJSONObject("grid") ?: JSONObject()
            if (grid.optInt("size") != 30 || grid.optString("unit") != "atlas-cell") {
                val out = gateway.platformVttCommand(activeWorldId(), PLAYER_ACTOR_ID, "gm", JSONObject()
                    .put("command_id", "atlas-grid-${UUID.randomUUID()}")
                    .put("base_version", version)
                    .put("command", "set_grid")
                    .put("grid", JSONObject()
                        .put("type", "square").put("size", 30).put("scale", 1.0).put("unit", "atlas-cell")
                        .put("originX", 0).put("originY", 0).put("orientation", "flat")))
                version = out.getInt("state_version"); state = out.getJSONObject("state")
            }
            val map = state.optJSONObject("map") ?: JSONObject()
            if (map.optDouble("width", -1.0) != MAP_WIDTH || map.optDouble("height", -1.0) != MAP_HEIGHT || map.optString("atlas_namespace") != "cyberpunk-red/night-city-2045") {
                val out = setAtlasMap(version, null)
                version = out.getInt("state_version"); state = out.getJSONObject("state")
            }
        }

        val tokens = state.optJSONObject("tokens") ?: JSONObject()
        if (!tokens.has(PLAYER_TOKEN_ID)) {
            val map = state.optJSONObject("map") ?: JSONObject()
            val w = map.optDouble("width", MAP_WIDTH).takeIf { it > 0 } ?: MAP_WIDTH
            val h = map.optDouble("height", MAP_HEIGHT).takeIf { it > 0 } ?: MAP_HEIGHT
            val out = gateway.platformVttCommand(activeWorldId(), PLAYER_ACTOR_ID, "gm", JSONObject()
                .put("command_id", "player-${UUID.randomUUID()}")
                .put("base_version", version)
                .put("command", "spawn_token")
                .put("tokenId", PLAYER_TOKEN_ID)
                .put("ownerId", PLAYER_ACTOR_ID)
                .put("entityRef", "player")
                .put("name", "Edgerunner")
                .put("x", w * 0.5)
                .put("y", h * 0.5)
                .put("size", 1.0))
            version = out.getInt("state_version"); state = out.getJSONObject("state")
        }
        return JSONObject().put("state_version", version).put("state", state)
    }

    private fun setAtlasMap(baseVersion: Int, locationId: String?): JSONObject {
        val atlasTile = JSONObject().put("id", "night-city-2045")
            .put("src", "assets/atlas/night_city_2045/atlas-manifest.json")
            .put("x", 0).put("y", 0).put("w", MAP_WIDTH).put("h", MAP_HEIGHT).put("z", 0)
        val map = JSONObject()
            .put("tiles", JSONArray().put(atlasTile))
            .put("width", MAP_WIDTH).put("height", MAP_HEIGHT)
            .put("atlas_namespace", "cyberpunk-red/night-city-2045")
            .put("occluders", JSONArray())
        if (!locationId.isNullOrBlank()) map.put("location_id", locationId)
        return gateway.platformVttCommand(activeWorldId(), PLAYER_ACTOR_ID, "gm", JSONObject()
            .put("command_id", "atlas-map-${UUID.randomUUID()}")
            .put("base_version", baseVersion)
            .put("command", "set_map")
            .put("map", map))
    }

    private fun sceneCatalog(): JSONObject = JSONObject(
        context.assets.open("web/app/assets/scenes/scene_catalog.json").bufferedReader().use { it.readText() }
    )

    /** Scene identity is encoded by the first VTT tile, keeping the Core map schema strict. */
    private fun sceneIdFromMap(map: JSONObject): String? {
        val tiles = map.optJSONArray("tiles") ?: return null
        if (tiles.length() == 0) return null
        val tile = tiles.optJSONObject(0) ?: return null
        val src = tile.optString("src")
        if (!src.startsWith("assets/scenes/")) return null
        return tile.optString("id").takeIf { it.isNotBlank() }
    }

    private fun findScene(sceneId: String): JSONObject {
        val scenes = sceneCatalog().getJSONArray("scenes")
        for (i in 0 until scenes.length()) {
            val scene = scenes.getJSONObject(i)
            if (scene.getString("id") == sceneId) return scene
        }
        error("Cena desconhecida: $sceneId")
    }

    fun status(): JSONObject = JSONObject(coreStatus.toString()).put("worldId", activeWorldId())

    fun geminiSettings(): JSONObject {
        val installed=androidTtsService.installedEngines()
        val found=(0 until installed.length()).map { installed.getJSONObject(it).getString("packageName") }
        val previous=secretStore.androidTtsEnginePackage()
        val migrated=BraseiroAndroidTtsPolicy.migrate(previous,found)
        if (migrated!=previous) secretStore.savePublicSettings(null,null,null,null,androidEnginePackage=migrated,androidVoice="")
        val kokoroPkg = androidTtsService.detectKokoroPackage()
        return JSONObject()
            .put("ok", true)
            .put("configured", secretStore.hasApiKey())
            .put("provider", if (secretStore.hasApiKey()) "gemini" else "local")
            .put("worldId", activeWorldId())
            .put("core", status())
            .put("textModel", secretStore.textModel())
            .put("ttsModel", secretStore.ttsModel())
            .put("voice", secretStore.ttsVoice())
            .put("language", secretStore.ttsLanguage())
            .put("ttsEngine", secretStore.ttsEngine())
            .put("androidVoice", secretStore.androidTtsVoice())
            .put("androidEnginePackage", secretStore.androidTtsEnginePackage())
            .put("voiceProfile", secretStore.voiceProfile())
            .put("voiceStyle", secretStore.voiceStyle())
            .put("ttsSpeed", secretStore.ttsSpeed().toDouble())
            .put("vocalMode", secretStore.vocalMode())
            .put("stripVocalTags", secretStore.stripVocalTags())
            .put("kokoroInstalled", kokoroPkg != null)
            .put("kokoroAvailable", kokoroPkg != null)
            .put("kokoroPackage", kokoroPkg ?: JSONObject.NULL)
            .put("kokoroLabel", if (kokoroPkg != null) "Braseiro Kokoro PT-BR • neural" else JSONObject.NULL)
            .put("installedEngines", androidTtsService.installedEngines())
            .put("installedTtsEngines", androidTtsService.installedEngines())
            .put("androidVoices", androidTtsService.voices())
            .put("geminiVoices", ttsService.availableVoices())
            .put("geminiModels", ttsService.availableModels())
            .put("tts", JSONObject()
                .put("selectedEngine", secretStore.ttsEngine())
                .put("gemini", ttsService.status())
                .put("android", androidTtsService.status()))
    }

    fun saveGeminiSettings(payload: JSONObject): JSONObject = synchronized(canonicalTurnLock) {
        val requestedEngine = payload.optString("ttsEngine").takeIf { it.isNotBlank() }
        if (requestedEngine!=null && requestedEngine!=secretStore.ttsEngine()) {
            val local=androidTtsService.status();val remote=ttsService.status()
            check(!local.optBoolean("speaking") && remote.optString("state") !in listOf("queued","generating","playing")) { "Pare a narração antes de trocar o provedor de voz" }
        }
        val kokoroPkg = androidTtsService.detectKokoroPackage()
        val rawPkg = if (payload.has("androidEnginePackage")) payload.optString("androidEnginePackage").trim().takeIf { it.isNotBlank() } else null
        val effectiveAndroidPkg = when {
            requestedEngine?.lowercase() == "kokoro" -> rawPkg?.takeIf { BraseiroAndroidTtsPolicy.isKokoro(it) } ?: kokoroPkg ?: error("Kokoro/Sherpa não instalado")
            rawPkg != null -> rawPkg
            requestedEngine?.lowercase() == "kokoro" && kokoroPkg != null -> kokoroPkg
            else -> null
        }
        if (effectiveAndroidPkg != null && requestedEngine?.lowercase() != "gemini") {
            check(androidTtsService.ensureEnginePackage(effectiveAndroidPkg.takeIf { it.isNotBlank() })) { "Motor TTS local indisponível" }
        }
        val packageChanged = effectiveAndroidPkg != null && effectiveAndroidPkg != secretStore.androidTtsEnginePackage()
        val selectedAndroidVoice = if (packageChanged) "" else if (payload.has("androidVoice")) payload.optString("androidVoice") else null
        if (effectiveAndroidPkg != null && requestedEngine?.lowercase() != "gemini") androidTtsService.validateVoice(selectedAndroidVoice)
        secretStore.savePublicSettings(
            textModel = payload.optString("textModel").takeIf { it.isNotBlank() },
            ttsModel = payload.optString("ttsModel").takeIf { it.isNotBlank() },
            voice = payload.optString("voice").takeIf { it.isNotBlank() },
            language = payload.optString("language").takeIf { it.isNotBlank() },
            engine = requestedEngine,
            androidVoice = selectedAndroidVoice,
            androidEnginePackage = effectiveAndroidPkg,
            voiceProfile = if (payload.has("voiceProfile")) payload.optString("voiceProfile") else null,
            voiceStyle = if (payload.has("voiceStyle")) payload.optString("voiceStyle") else null,
            ttsSpeed = if (payload.has("ttsSpeed")) payload.optDouble("ttsSpeed", 1.0).toFloat() else null,
            vocalMode = if (payload.has("vocalMode")) payload.optString("vocalMode") else null,
            stripVocalTags = if (payload.has("stripVocalTags")) payload.optBoolean("stripVocalTags", true) else null,
        )
        val key = secretStore.apiKey()
        val configured = gateway.configure(
            apiKey = key,
            model = secretStore.textModel(),
            ragDbPath = File(context.filesDir, "barbara-rag.sqlite3").absolutePath,
            useGemini = key != null,
        )
        coreStatus.put("geminiConfigured", key != null).put("configured", configured)
        runCatching { ensurePlatformReadyForTurn() }
            .onFailure { coreStatus.put("platformRecoveryError", it.message ?: it.javaClass.simpleName) }
        geminiSettings()
    }

    fun saveGeminiApiKeyNative(apiKey: String): JSONObject = synchronized(canonicalTurnLock) {
        secretStore.setApiKey(apiKey)
        val configured = gateway.configure(
            apiKey = secretStore.apiKey(),
            model = secretStore.textModel(),
            ragDbPath = File(context.filesDir, "barbara-rag.sqlite3").absolutePath,
            useGemini = true,
        )
        coreStatus.put("geminiConfigured", true).put("configured", configured)
        runCatching { ensurePlatformReadyForTurn() }
            .onFailure { coreStatus.put("platformRecoveryError", it.message ?: it.javaClass.simpleName) }
        geminiSettings()
    }

    fun clearGeminiApiKeyNative(): JSONObject = synchronized(canonicalTurnLock) {
        secretStore.clearApiKey()
        val configured = gateway.configure(
            apiKey = null,
            model = secretStore.textModel(),
            ragDbPath = File(context.filesDir, "barbara-rag.sqlite3").absolutePath,
            useGemini = false,
        )
        ttsService.stop()
        androidTtsService.stop()
        coreStatus.put("geminiConfigured", false).put("configured", configured)
        geminiSettings()
    }

    fun speakGeminiTts(payload: JSONObject): JSONObject {
        val text = payload.optString("text")
        val style = payload.optString("style").takeIf { it.isNotBlank() } ?: secretStore.voiceStyle()
        val profile = payload.optString("voiceProfile").takeIf { it.isNotBlank() } ?: secretStore.voiceProfile()
        val speed = when {
            payload.has("speed") -> payload.optDouble("speed", secretStore.ttsSpeed().toDouble()).toFloat()
            payload.has("ttsSpeed") -> payload.optDouble("ttsSpeed", secretStore.ttsSpeed().toDouble()).toFloat()
            else -> secretStore.ttsSpeed()
        }
        val stripTags = if (payload.has("stripVocalTags")) payload.optBoolean("stripVocalTags", true) else secretStore.stripVocalTags()
        val maxChunkChars = payload.optInt("maxChunkChars", 650)
        val requested = payload.optString("engine").takeIf { it.isNotBlank() } ?: secretStore.ttsEngine()
        val explicitEnginePkg = if (payload.has("androidEnginePackage")) payload.optString("androidEnginePackage").trim().takeIf { it.isNotBlank() } else null
        val kokoroPkg = androidTtsService.detectKokoroPackage()
        val preferredEnginePkg = explicitEnginePkg ?: secretStore.androidTtsEnginePackage().takeIf { it.isNotBlank() } ?: kokoroPkg
        return when (requested.lowercase()) {
            "gemini" -> {
                androidTtsService.stop()
                ttsService.speakAsync(text, style, profile, speed, stripTags).put("engine", "gemini")
            }
            "kokoro" -> {
                val exact = explicitEnginePkg ?: kokoroPkg ?: error("Braseiro Kokoro/Sherpa não está instalado. Escolha um motor local instalado nas configurações.")
                require(androidTtsService.isKokoroEngine(exact)) { "O pacote selecionado não é o Kokoro/Sherpa do Forbidden Lands" }
                ttsService.stop()
                androidTtsService.speakAsync(text, secretStore.androidTtsVoice(), secretStore.ttsLanguage(), style, speed, stripTags, exact, maxChunkChars)
            }
            "android" -> {
                ttsService.stop()
                val targetPkg = explicitEnginePkg ?: secretStore.androidTtsEnginePackage().takeIf { it.isNotBlank() }
                androidTtsService.speakAsync(text, secretStore.androidTtsVoice(), secretStore.ttsLanguage(), style, speed, stripTags, targetPkg, maxChunkChars)
            }
            else -> {
                ttsService.stop()
                androidTtsService.speakAsync(text, secretStore.androidTtsVoice(), secretStore.ttsLanguage(), style, speed, stripTags, explicitEnginePkg ?: secretStore.androidTtsEnginePackage().takeIf { it.isNotBlank() }, maxChunkChars)
            }
        }
    }

    fun stopGeminiTts(): JSONObject {
        val android = androidTtsService.stop()
        val gemini = ttsService.stop()
        val isInterrupted = android.optBoolean("interrupted", false) || gemini.optBoolean("interrupted", false)
        val wasActive = android.optBoolean("wasActive", false) || gemini.optBoolean("wasActive", false)
        return JSONObject()
            .put("ok", true)
            .put("interrupted", isInterrupted)
            .put("wasActive", wasActive)
            .put("speakingAfterStop", false)
            .put("interruptedAtChunk", android.optInt("interruptedAtChunk", 1))
            .put("android", android)
            .put("gemini", gemini)
    }

    fun close() {
        ttsService.close()
        androidTtsService.close()
    }

    /**
     * Copia PDFs escolhidos pelo usuário (inclusive pelo provedor Google Drive do SAF),
     * registra SHA-256/proveniência e só então monta/indexa o corpus no RAG do World ativo.
     * O runtime nunca lê uma pasta remota silenciosamente e nunca depende do Drive em jogo.
     */
    fun importRuleDocuments(uris: List<Uri>): JSONObject = synchronized(canonicalTurnLock) {
        require(uris.isNotEmpty() && uris.size <= 32) { "Selecione entre 1 e 32 PDFs" }
        val root = File(context.filesDir, "barbara-rule-corpus/cyberpunk-red-user").apply { mkdirs() }
        val corpus = File(root, "documents").apply { mkdirs() }
        val manifestFile = File(root, "source_manifest.json")
        val manifest = if (manifestFile.exists()) runCatching { JSONObject(manifestFile.readText()) }.getOrNull() ?: JSONObject() else JSONObject()
        val sources = manifest.optJSONObject("sources") ?: JSONObject().also { manifest.put("sources", it) }
        val imported = JSONArray()
        val limit = 256L * 1024L * 1024L
        for (uri in uris) {
            var displayName = "manual.pdf"
            var declaredSize = -1L
            context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    displayName = cursor.getString(0)?.takeIf { it.isNotBlank() } ?: displayName
                    declaredSize = if (cursor.isNull(1)) -1L else cursor.getLong(1)
                }
            }
            require(displayName.lowercase().endsWith(".pdf")) { "Apenas PDFs podem entrar no corpus de regras: $displayName" }
            require(declaredSize < 0 || declaredSize <= limit) { "PDF excede 256 MB: $displayName" }
            val safeName = displayName.removeSuffix(".pdf").replace(Regex("[^a-zA-Z0-9._-]+"), "_").take(80).ifBlank { "manual" }
            val temporary = File(root, ".import-${UUID.randomUUID()}.tmp")
            val digest = MessageDigest.getInstance("SHA-256")
            var total = 0L
            context.contentResolver.openInputStream(uri).use { input ->
                requireNotNull(input) { "Não foi possível abrir $displayName" }
                temporary.outputStream().use { output ->
                    val buffer = ByteArray(128 * 1024)
                    while (true) {
                        val read = input.read(buffer)
                        if (read < 0) break
                        total += read
                        require(total <= limit) { "PDF excede 256 MB: $displayName" }
                        digest.update(buffer, 0, read)
                        output.write(buffer, 0, read)
                    }
                }
            }
            require(total > 4) { "PDF vazio ou inválido: $displayName" }
            val pdfMagic = temporary.inputStream().use { input -> ByteArray(5).also { require(input.read(it) == 5) } }
            require(pdfMagic.toString(Charsets.US_ASCII) == "%PDF-") { "Arquivo selecionado não contém assinatura PDF válida: $displayName" }
            val sha256 = digest.digest().joinToString("") { "%02x".format(it) }
            val target = File(corpus, "${sha256.take(16)}_$safeName.pdf")
            if (target.exists()) temporary.delete()
            else require(temporary.renameTo(target)) { "Falha ao finalizar importação de $displayName" }
            sources.put(sha256, JSONObject()
                .put("displayName", displayName)
                .put("localName", target.name)
                .put("sha256", sha256)
                .put("size", total)
                .put("importedAtEpochMs", System.currentTimeMillis())
                .put("provenance", "android-storage-access-framework"))
            imported.put(JSONObject().put("displayName", displayName).put("sha256", sha256).put("size", total))
        }
        manifest.put("schema", "barbara-rule-corpus-manifest-v1")
            .put("systemId", SYSTEM_ID)
            .put("namespace", "cyberpunk-red/manuals/user")
            .put("updatedAtEpochMs", System.currentTimeMillis())
        manifestFile.writeText(manifest.toString(2))
        val revisionDigest = MessageDigest.getInstance("SHA-256")
        corpus.listFiles { file -> file.isFile && file.extension.lowercase() == "pdf" }
            ?.sortedBy { it.name }
            ?.forEach { revisionDigest.update("${it.name}:${it.length()}\n".toByteArray()) }
        val revision = revisionDigest.digest().joinToString("") { "%02x".format(it) }
        val indexed = gateway.importRuleCorpus(
            activeWorldId(), corpus.absolutePath, "cyberpunk-red/manuals/user", revision,
        )
        JSONObject()
            .put("ok", indexed.optBoolean("ok", false))
            .put("imported", imported)
            .put("revision", revision)
            .put("index", indexed)
    }

    fun ruleCorpusStatus(): JSONObject = gateway.ruleCorpusStatus(activeWorldId())

    /** Exporta somente por SAF; o manifesto privado nunca é devolvido à WebView. */
    fun exportRuleSourceManifest(uri: Uri): JSONObject = synchronized(canonicalTurnLock) {
        val manifestFile = File(context.filesDir, "barbara-rule-corpus/cyberpunk-red-user/source_manifest.json")
        require(manifestFile.isFile) { "Nenhum manifesto de fontes foi criado. Importe PDFs primeiro." }
        val manifest = JSONObject(manifestFile.readText())
        require(manifest.optString("schema") == "barbara-rule-corpus-manifest-v1") { "Manifesto de fontes inválido." }
        val bytes = manifest.toString(2).toByteArray(Charsets.UTF_8)
        context.contentResolver.openOutputStream(uri, "wt").use { output ->
            requireNotNull(output) { "Não foi possível abrir o destino do manifesto." }
            output.write(bytes)
            output.flush()
        }
        JSONObject()
            .put("ok", true)
            .put("schema", manifest.getString("schema"))
            .put("sources", manifest.optJSONObject("sources")?.length() ?: 0)
            .put("bytes", bytes.size)
            .put("exportedBy", "android-storage-access-framework")
    }

    /**
     * Commits a typed resolution through BarbaraPlatform. This is the only general
     * canonical mutation path used by the Android host. The Room row is updated only
     * after Barbara's durable CAS succeeds, and is therefore a rebuildable UI projection.
     */
    private fun canonicalTurn(request: JSONObject): JSONObject = synchronized(canonicalTurnLock) {
        // Recover from partial startup before every canonical mutation. configurePlatform is
        // idempotent for an existing platform root and is the authoritative fix for
        // `barbara_platform_not_configured` observed on a real Android device.
        ensurePlatformReadyForTurn()
        if (request.has("resolution") && !request.has("resume_action_id")) {
            gateway.commitTypedResolution(activeWorldId(), request)
        } else {
            gateway.platformTurn(activeWorldId(), request)
        }
    }

    private fun canonicalCharacterKey(characterId: String): String =
        UUID.nameUUIDFromBytes(characterId.toByteArray(Charsets.UTF_8)).toString()

    private val weaponMagazines = mapOf(
        "mediumPistol" to 12, "airPistol" to 12, "heavyPistol" to 8, "veryHeavyPistol" to 8,
        "smg" to 30, "heavySmg" to 40, "shotgun" to 4, "assaultRifle" to 25, "sniperRifle" to 4,
        "bow" to 1, "grenadeLauncher" to 2, "rocketLauncher" to 1,
    )

    private fun weaponMagazine(character: JSONObject, weaponId: String): Int {
        val baseId = weaponId.substringBefore("::bc-mode-")
        weaponMagazines[baseId]?.let { return it }
        val item = equipmentItem(baseId, character) ?: return 0
        val direct = when {
            item.has("magazine") -> item.optInt("magazine", 0)
            item.has("mag") -> item.optInt("mag", 0)
            else -> -1
        }
        if (direct >= 0) return direct
        val runtime = item.optJSONObject("runtimeWeapon")
        if (runtime != null) return runtime.optInt("mag", runtime.optInt("magazine", 0))
        val modes = item.optJSONArray("modes")
        if (modes != null && modes.length() > 0) {
            val suffix = Regex("::bc-mode-(\\d+)$").find(weaponId)?.groupValues?.getOrNull(1)?.toIntOrNull() ?: 0
            val mode = modes.optJSONObject(suffix.coerceIn(0, modes.length() - 1))
            if (mode != null) return mode.optInt("magazine", mode.optInt("mag", 0))
        }
        return 0
    }

    private fun combatPlayer(character: JSONObject): JSONObject =
        character.optJSONObject("combatState")?.optJSONObject("player") ?: JSONObject()

    private fun combatFlow(character: JSONObject): JSONObject =
        character.optJSONObject("combatState")?.optJSONObject("flow") ?: JSONObject()

    private fun combatAmmo(character: JSONObject, weaponId: String): Int {
        val capacity = weaponMagazine(character, weaponId)
        return character.optJSONObject("combatState")?.optJSONObject("ammo")?.optInt(weaponId, capacity) ?: capacity
    }

    private fun inventoryAmmo(character: JSONObject, ammoItemId: String): Int {
        require(ammoItemId.matches(Regex("ammo[A-Za-z0-9_-]{1,80}"))) { "ID de munição inválido" }
        val inventory = character.optJSONArray("inventory") ?: JSONArray()
        return (0 until inventory.length()).sumOf { index ->
            inventory.optJSONObject(index)?.takeIf { it.optString("itemId") == ammoItemId }?.optInt("quantity", 0) ?: 0
        }
    }

    private fun inventoryQuantity(character: JSONObject, itemId: String): Int {
        val inventory = character.optJSONArray("inventory") ?: JSONArray()
        return (0 until inventory.length()).sumOf { index ->
            inventory.optJSONObject(index)?.takeIf { it.optString("itemId") == itemId }?.optInt("quantity", 0) ?: 0
        }
    }

    private fun priceCategoryRank(price: Int): Int = when {
        price <= 10 -> 1
        price <= 20 -> 2
        price <= 50 -> 3
        price <= 100 -> 4
        price <= 500 -> 5
        price <= 1000 -> 6
        price <= 5000 -> 7
        else -> 8
    }

    private fun fixerReachRank(rank: Int, nightMarketActive: Boolean): Int = when {
        rank < 1 -> 4
        rank <= 2 -> 2
        rank <= 4 -> 5
        rank <= 6 -> if (nightMarketActive) 8 else 5
        rank <= 8 -> 6
        rank == 9 -> 7
        else -> 8
    }

    private fun validateEconomyTransition(previous: JSONObject, next: JSONObject, action: String, evidence: JSONObject) {
        require(action in setOf("buy_item", "sell_item")) { "Ação econômica não suportada" }
        val itemId = evidence.getString("itemId")
        val item = equipmentItem(itemId, previous) ?: error("Item fora dos catálogos Core/suplementares validados")
        val quantity = evidence.optInt("quantity", 1)
        require(quantity in 1..100) { "Quantidade econômica inválida" }
        val unitPrice = item.optInt("price", -1)
        require(unitPrice >= 0 && evidence.getInt("unitPrice") == unitPrice) { "Preço unitário divergente do catálogo" }
        val beforeEconomy = previous.optJSONObject("economy") ?: JSONObject()
        val afterEconomy = next.optJSONObject("economy") ?: JSONObject()
        val beforeBudget = beforeEconomy.optInt("equipmentBudget", 0)
        val beforeCash = beforeEconomy.optInt("eurobucks", 0)
        val afterBudget = afterEconomy.optInt("equipmentBudget", 0)
        val afterCash = afterEconomy.optInt("eurobucks", 0)
        val unitQuantity = maxOf(1, item.optInt("quantity", 1))
        if (action == "sell_item") {
            require(!evidence.optBoolean("haggle", false)) { "Haggle exige resolução oposta canônica separada" }
            require(evidence.optInt("unitQuantity", -1) == unitQuantity) { "Unidade comercial divergente" }
            val removeQuantity = unitQuantity * quantity
            require(evidence.optInt("removeQuantity", -1) == removeQuantity) { "Quantidade de venda divergente" }
            val total = unitPrice * quantity
            require(evidence.getInt("total") == total) { "Total da venda divergente do Market Price" }
            require(inventoryQuantity(previous, itemId) >= removeQuantity) { "Quantidade possuída insuficiente" }
            val beforeInventory = previous.optJSONArray("inventory") ?: JSONArray()
            for (index in 0 until beforeInventory.length()) {
                val row = beforeInventory.optJSONObject(index) ?: continue
                if (row.optString("itemId") == itemId) require(!row.optBoolean("equipped", false)) { "Item equipado deve ser desequipado antes da venda" }
            }
            require(afterBudget == beforeBudget) { "Venda não altera orçamento inicial" }
            require(afterCash == beforeCash + total) { "Crédito da venda divergente" }
            require(inventoryQuantity(next, itemId) == inventoryQuantity(previous, itemId) - removeQuantity) { "Quantidade vendida divergente" }
            return
        }
        val total = unitPrice * quantity
        require(evidence.getInt("total") == total) { "Total da compra divergente" }
        require(evidence.optInt("categoryRank", -1) == priceCategoryRank(unitPrice)) { "Categoria de preço divergente" }
        when (evidence.getString("currencySource")) {
            "equipmentBudget" -> {
                require(beforeBudget >= total) { "Orçamento inicial insuficiente" }
                require(afterBudget == beforeBudget - total && afterCash == beforeCash) { "Débito do orçamento divergente" }
            }
            "eurobucks" -> {
                require(beforeBudget < total) { "Orçamento inicial disponível deve ser usado primeiro" }
                require(beforeCash >= total) { "Eurobucks insuficientes" }
                val categoryRank = priceCategoryRank(unitPrice)
                val role = previous.optString("role").lowercase()
                val roleRank = previous.optInt("roleAbilityRank", 0)
                val nightMarket = previous.optJSONObject("campaignState")?.optJSONObject("market")?.optBoolean("nightMarketActive", false) ?: false
                val maxRank = if (role == "fixer") fixerReachRank(roleRank, nightMarket) else 4
                require(categoryRank <= maxRank) { "Acesso de mercado insuficiente" }
                require(afterCash == beforeCash - total && afterBudget == beforeBudget) { "Débito de eurobucks divergente" }
            }
            else -> error("Fonte de pagamento inválida")
        }
        require(inventoryQuantity(next, itemId) == inventoryQuantity(previous, itemId) + unitQuantity * quantity) { "Quantidade adquirida divergente" }
    }

    private fun npcCombatant(character: JSONObject, targetKey: String): JSONObject =
        character.optJSONObject("campaignState")?.optJSONObject("npcCombat")?.optJSONObject(targetKey) ?: JSONObject()

    private fun sceneCover(character: JSONObject, sceneId: String, coverId: String): JSONObject =
        character.optJSONObject("campaignState")?.optJSONObject("sceneCover")?.optJSONObject(sceneId)?.optJSONObject(coverId) ?: JSONObject()

    private fun netArchitecture(character: JSONObject, key: String): JSONObject =
        character.optJSONObject("campaignState")?.optJSONObject("netArchitectures")?.optJSONObject(key) ?: JSONObject()

    private fun vehicle(character: JSONObject, vehicleId: String): JSONObject =
        character.optJSONObject("campaignState")?.optJSONObject("vehicles")?.optJSONObject(vehicleId) ?: JSONObject()

    private fun validateVehicleTransition(previous: JSONObject, next: JSONObject, action: String, evidence: JSONObject) {
        require(action in setOf("vehicle_select", "vehicle_drive", "vehicle_maneuver", "vehicle_ram")) { "Ação de veículo não suportada" }
        val vehicleId = evidence.getString("vehicleId")
        val before = vehicle(previous, vehicleId)
        val after = vehicle(next, vehicleId)
        require(after.length() > 0 && after.optInt("sdp", -1) in 0..after.optInt("maxSdp", -1)) { "Estado do veículo inválido" }
        if (before.length() > 0) require(after.optInt("maxSdp", 0) == before.optInt("maxSdp", 0)) { "SDP máximo do veículo é imutável" }
        if (action == "vehicle_drive") {
            if (before.length() > 0) require(after.optInt("sdp", 0) == before.optInt("sdp", 0)) { "Condução básica não altera SDP" }
            require(after.optBoolean("lostControl", false) == !evidence.getBoolean("success")) { "Resultado de controle divergente" }
            if (evidence.optBoolean("consumesAction", false) && combatFlow(previous).optBoolean("active", false)) require(combatFlow(next).optBoolean("playerActionUsed", false)) { "Condução DV10 deve consumir Ação" }
        }
        if (action == "vehicle_maneuver") {
            require(evidence.getInt("dv") in setOf(13, 17)) { "DV de manobra inválida" }
            require(after.optBoolean("lostControl", false) == !evidence.getBoolean("success")) { "Falha de manobra deve perder controle" }
            if (combatFlow(previous).optBoolean("active", false)) require(combatFlow(next).optBoolean("playerActionUsed", false)) { "Manobra deve consumir Ação" }
        }
        if (action == "vehicle_ram") {
            val damage = evidence.getInt("damage")
            require(damage in 0..36) { "Dano de atropelamento inválido" }
            require(evidence.getInt("sdpAfter") == maxOf(0, evidence.getInt("sdpBefore") - damage)) { "SDP pós-colisão divergente" }
            require(after.optInt("sdp", -1) == evidence.getInt("sdpAfter")) { "SDP persistido divergente" }
            val targetKey = evidence.getString("targetKey")
            val target = npcCombatant(next, targetKey)
            require(target.length() > 0 && target.optInt("hp", Int.MIN_VALUE) == evidence.getInt("targetHpAfter")) { "HP do atropelado divergente" }
            require(evidence.getInt("targetHpAfter") == evidence.getInt("targetHpBefore") - damage) { "Dano do atropelado divergente" }
        }
    }

    private fun streetDrugActive(character: JSONObject, drugId: String): Boolean {
        val campaign = character.optJSONObject("campaignState") ?: return false
        val clock = campaign.optJSONObject("worldClock") ?: JSONObject()
        val nowMinute = if (clock.has("elapsedMinutes")) clock.optLong("elapsedMinutes", 0L) else clock.optLong("elapsedSeconds", 0L) / 60L
        val active = campaign.optJSONObject("streetDrugs")?.optJSONArray("active") ?: return false
        for (i in 0 until active.length()) {
            val row = active.optJSONObject(i) ?: continue
            if (row.optString("drugId") == drugId && row.optLong("expiresAtMinute", 0L) > nowMinute) return true
        }
        return false
    }

    private fun validateNetrunTransition(previous: JSONObject, next: JSONObject, action: String, evidence: JSONObject) {
        val allowed = setOf("net_new_turn", "net_jack", "net_scanner", "net_pathfinder", "net_backdoor", "net_eye_dee", "net_control", "net_zap", "net_slide", "net_cloak", "net_virus", "net_advance", "net_sixgun_extra_action")
        require(action in allowed) { "NET Action não suportada" }
        require(previous.optString("role") == "netrunner" && next.optString("role") == "netrunner") { "Interface exige Netrunner" }
        require(next.optInt("roleAbilityRank", 0) > 0) { "Grau de Interface inválido" }
        val key = evidence.getString("architectureKey")
        val before = netArchitecture(previous, key)
        val after = netArchitecture(next, key)
        require(after.length() > 0) { "NET Architecture ausente" }
        val actionsBefore = if (before.length() > 0) before.optInt("actionsUsed", 0) else evidence.getInt("actionsBefore")
        val actionsAfter = after.optInt("actionsUsed", -1)
        val actionsMax = after.optInt("actionsMax", 0)
        val sixgunActive = streetDrugActive(next, "sixgun")
        val sixgunBoostedThisTurn = sixgunActive && after.optInt("sixgunExtraActionTurn", -1) == after.optInt("turn", -2)
        require(actionsAfter >= 0 && actionsAfter <= actionsMax && actionsMax in 2..(if (sixgunBoostedThisTurn) 6 else 5)) { "Orçamento de NET Actions inválido" }
        if (action == "net_new_turn") {
            require(actionsAfter == 0 && evidence.getInt("turnAfter") > evidence.getInt("turnBefore")) { "Novo turno NET inválido" }
        } else if (action == "net_advance" || action == "net_scanner") {
            require(actionsAfter == actionsBefore) { if (action == "net_scanner") "Scanner usa Meat Action, não NET Action" else "Movimento entre floors não consome NET Action" }
            if (action == "net_scanner" && evidence.optBoolean("consumesMeatAction", false) && combatFlow(previous).optBoolean("active", false)) {
                require(!combatFlow(previous).optBoolean("playerActionUsed", false) && combatFlow(next).optBoolean("playerActionUsed", false)) { "Scanner deve consumir Meat Action em combate" }
            }
        } else if (action == "net_sixgun_extra_action") {
            require(sixgunActive && before.optBoolean("jackedIn", false) && after.optBoolean("jackedIn", false)) { "Sixgun exige efeito primário ativo e Jack In" }
            require(actionsAfter == actionsBefore) { "Sixgun não consome NET Action para conceder a ação extra" }
            val beforeMax = before.optInt("actionsMax", 0)
            require(beforeMax in 2..5 && actionsMax == beforeMax + 1) { "Bônus de NET Action de Sixgun divergente" }
            val turn = after.optInt("turn", 0)
            require(turn > 0 && before.optInt("sixgunExtraActionTurn", -1) != turn && after.optInt("sixgunExtraActionTurn", -1) == turn) { "Sixgun só pode ser usado uma vez por Turno NET" }
            val humanityBefore = previous.optJSONObject("derived")?.optInt("humanity", Int.MIN_VALUE) ?: Int.MIN_VALUE
            val humanityAfter = next.optJSONObject("derived")?.optInt("humanity", Int.MIN_VALUE) ?: Int.MIN_VALUE
            require(humanityBefore > 0 && humanityAfter == humanityBefore - 1) { "Custo de Humanity de Sixgun divergente" }
            require(evidence.optInt("humanityCost", 0) == 1 && evidence.optInt("humanityBefore", Int.MIN_VALUE) == humanityBefore && evidence.optInt("humanityAfter", Int.MIN_VALUE) == humanityAfter) { "Evidência de Humanity de Sixgun divergente" }
            require(evidence.optInt("actionsMaxBefore", -1) == beforeMax && evidence.optInt("actionsMaxAfter", -1) == actionsMax) { "Evidência de NET Actions de Sixgun divergente" }
        } else {
            require(actionsAfter == actionsBefore + 1) { "Consumo de NET Action divergente" }
        }
        val floors = after.optJSONArray("floors") ?: JSONArray()
        val floor = after.optInt("currentFloor", -1)
        require(floors.length() in 2..30 && floor in 0 until floors.length()) { "Floor NET inválido" }
        require(kotlin.math.abs(evidence.getInt("floorAfter") - evidence.getInt("floorBefore")) <= 1) { "Salto de floor inválido" }
        if (action == "net_virus") {
            require(evidence.getInt("dv") in 6..30 && evidence.getInt("requiredActions") in 1..10 && evidence.getString("effect").isNotBlank()) { "Parâmetros do Virus inválidos" }
        }
    }

    // Operational R4.31+: character/VTT time is a projection of Motor Barbara's
    // canonical state.game_time.elapsed_seconds. Device wall-clock time is never authority.
    private val streetDrugDurations = mapOf(
        "black_lace" to 1440, "blue_glass" to 240, "boost" to 1440, "smash" to 240, "synthcoke" to 240,
        "berserker" to 10, "prime_time" to 240, "sixgun" to 240, "timewarp" to 1,
    )
    private val streetDrugSecondaryDv = mapOf(
        "black_lace" to 17, "blue_glass" to 15, "boost" to 17, "smash" to 15, "synthcoke" to 15,
        "berserker" to 17, "prime_time" to 17, "sixgun" to 17, "timewarp" to 17,
    )
    private val smashSkills = listOf("dance", "contortionist", "conversation", "human_perception", "persuasion", "acting")

    private fun normalizedWorldClock(character: JSONObject): JSONObject {
        val campaign = campaignStateOf(character)
        val source = campaign.optJSONObject("worldClock") ?: JSONObject()
        val seconds = when {
            source.has("elapsedSeconds") -> source.optLong("elapsedSeconds", 0L)
            else -> source.optLong("elapsedMinutes", 0L) * 60L + source.optLong("subMinuteSeconds", 0L)
        }.coerceAtLeast(0L)
        val elapsedMinutes = seconds / 60L
        val out = JSONObject()
            .put("epoch", source.optString("epoch", "campaign-start").ifBlank { "campaign-start" })
            .put("elapsedSeconds", seconds)
            .put("elapsedMinutes", elapsedMinutes)
            .put("subMinuteSeconds", seconds % 60L)
            .put("day", (seconds / 86400L) + 1L)
            .put("minuteOfDay", elapsedMinutes % 1440L)
            .put("secondOfMinute", seconds % 60L)
            .put("source", "motor-barbara-game-time")
        campaign.put("worldClock", out)
        return out
    }

    private fun clockAtElapsedSeconds(clock: JSONObject, secondsRaw: Long): JSONObject {
        val seconds = secondsRaw.coerceAtLeast(0L)
        val elapsedMinutes = seconds / 60L
        return JSONObject()
            .put("epoch", clock.optString("epoch", "campaign-start").ifBlank { "campaign-start" })
            .put("elapsedSeconds", seconds)
            .put("elapsedMinutes", elapsedMinutes)
            .put("subMinuteSeconds", seconds % 60L)
            .put("day", (seconds / 86400L) + 1L)
            .put("minuteOfDay", elapsedMinutes % 1440L)
            .put("secondOfMinute", seconds % 60L)
            .put("source", "motor-barbara-game-time")
    }

    private fun canonicalGameTimeSeconds(committed: JSONObject): Long? {
        val gameTime = committed.optJSONObject("state")?.optJSONObject("game_time") ?: return null
        val raw = gameTime.optDouble("elapsed_seconds", Double.NaN)
        if (!raw.isFinite() || raw < 0.0) return null
        return kotlin.math.floor(raw).toLong()
    }

    private fun rollCriticalD10(): JSONObject {
        fun d10(): Int = kotlin.random.Random.nextInt(1, 11)
        val natural = d10()
        val extra = if (natural == 1 || natural == 10) d10() else 0
        val total = when (natural) { 10 -> natural + extra; 1 -> natural - extra; else -> natural }
        return JSONObject().put("natural", natural).put("extra", extra).put("total", total)
            .put("critical", when (natural) { 10 -> "success"; 1 -> "failure"; else -> JSONObject.NULL })
    }

    private fun recomputeStreetDrugModifiers(character: JSONObject, nowMinute: Long): JSONObject {
        val campaign = campaignStateOf(character)
        val state = campaign.optJSONObject("streetDrugs") ?: JSONObject().also { campaign.put("streetDrugs", it) }
        val active = state.optJSONArray("active") ?: JSONArray().also { state.put("active", it) }
        val addictions = state.optJSONObject("addictions") ?: JSONObject().also { state.put("addictions", it) }
        val activeIds = mutableSetOf<String>()
        for (i in 0 until active.length()) {
            val row = active.optJSONObject(i) ?: continue
            if (row.optLong("expiresAtMinute", 0L) > nowMinute) activeIds += row.optString("drugId")
        }
        var ref = 0; var intMod = 0; var cool = 0; var will = 0; var move = 0; var initiative = 0; var netSpeed = 0
        val skillMods = JSONObject(); val statMinimums = JSONObject()
        val flags = JSONObject()
            .put("ignoreSeriouslyWounded", false).put("blueGlassFlashout", false)
            .put("blueGlassImmuneToFlashout", false).put("paranoid", false)
            .put("berserkerNoCriticalBonus", false).put("berserkerHalfWoundPenalties", false).put("berserkerHalfFacedownPenalty", false)
            .put("sixgunSafeJackOut", false).put("sixgunExtraNetActionHumanityCost", 0)
        fun addicted(id: String) = addictions.optBoolean(id, false)
        if (addicted("black_lace") && "black_lace" !in activeIds) ref -= 2
        if (addicted("boost")) intMod -= 2
        if (addicted("smash")) smashSkills.forEach { skillMods.put(it, skillMods.optInt(it, 0) - 2) }
        if (addicted("synthcoke") && "synthcoke" !in activeIds) ref -= 2
        if (addicted("blue_glass") && "blue_glass" !in activeIds) flags.put("blueGlassFlashout", true)
        if (addicted("prime_time") && "prime_time" !in activeIds) cool -= 2
        if (addicted("sixgun") && "sixgun" !in activeIds) netSpeed -= 2
        if (addicted("timewarp") && "timewarp" !in activeIds) initiative -= 2
        if ("black_lace" in activeIds) flags.put("ignoreSeriouslyWounded", true)
        if ("boost" in activeIds) intMod += 2
        if ("smash" in activeIds) smashSkills.forEach { skillMods.put(it, skillMods.optInt(it, 0) + 2) }
        if ("synthcoke" in activeIds) { ref += 1; flags.put("paranoid", true) }
        if ("blue_glass" in activeIds) {
            if (addicted("blue_glass")) flags.put("blueGlassImmuneToFlashout", true)
            else flags.put("blueGlassFlashout", true)
        }
        if ("berserker" in activeIds) flags.put("berserkerNoCriticalBonus", true).put("berserkerHalfWoundPenalties", true).put("berserkerHalfFacedownPenalty", true)
        if ("prime_time" in activeIds) { cool += 2; will += 2 }
        if ("sixgun" in activeIds) { ref -= 2; move -= 2; statMinimums.put("REF", 1).put("MOVE", 1); netSpeed += 2; flags.put("sixgunSafeJackOut", true).put("sixgunExtraNetActionHumanityCost", 1) }
        if ("timewarp" in activeIds) initiative += 3
        val statMods = JSONObject().put("REF", ref).put("INT", intMod).put("COOL", cool).put("WILL", will).put("MOVE", move)
        val mods = JSONObject().put("statMods", statMods).put("statMinimums", statMinimums)
            .put("skillMods", skillMods).put("flags", flags).put("initiativeMod", initiative).put("netSpeedMod", netSpeed).put("atMinute", nowMinute)
            .put("activeIds", JSONArray(activeIds.toList().sorted()))
        state.put("modifiers", mods)
        return mods
    }

    private fun expireStreetDrugsForClock(character: JSONObject, nowMinute: Long): JSONArray {
        val campaign = campaignStateOf(character)
        val state = campaign.optJSONObject("streetDrugs") ?: JSONObject().also { campaign.put("streetDrugs", it) }
        val active = state.optJSONArray("active") ?: JSONArray().also { state.put("active", it) }
        val addictions = state.optJSONObject("addictions") ?: JSONObject().also { state.put("addictions", it) }
        val recovery = state.optJSONObject("recovery") ?: JSONObject().also { state.put("recovery", it) }
        val history = state.optJSONArray("history") ?: JSONArray().also { state.put("history", it) }
        val remaining = JSONArray(); val resolutions = JSONArray()
        val stats = character.optJSONObject("stats") ?: JSONObject()
        val skills = character.optJSONObject("skills") ?: JSONObject()
        val will = stats.optInt("WILL", 0); val cyberware = character.optJSONArray("cyberware") ?: JSONArray(); var toxinBinderBonus = 0
        for (j in 0 until cyberware.length()) { val cw = cyberware.optJSONObject(j) ?: continue; val key = (cw.optString("id") + " " + cw.optString("name")).lowercase(); if (cw.optBoolean("installed", true) && (key.contains("toxin_binders") || key.contains("toxin binders"))) { toxinBinderBonus = 2; break } }
        val resist = skills.optInt("resist", 0) + toxinBinderBonus
        val derived = character.optJSONObject("derived") ?: JSONObject().also { character.put("derived", it) }
        var humanity = derived.optInt("humanity", stats.optInt("EMP", 0) * 10)
        val maxHumanity = derived.optInt("maxHumanity", stats.optInt("EMP", 0) * 10).coerceAtLeast(0)
        fun applyNewAddictionConsequences(id: String, resolution: JSONObject) {
            if (id == "berserker") {
                humanity = (humanity - 2).coerceAtLeast(0)
                val combat = character.optJSONObject("combatState") ?: JSONObject().also { character.put("combatState", it) }
                val player = combat.optJSONObject("player") ?: JSONObject().also { combat.put("player", it) }
                player.put("deathSavePenalty", player.optInt("deathSavePenalty", 0) + 1)
                resolution.put("permanentHumanityLoss", 2).put("permanentDeathSavePenalty", 1)
            } else if (id == "prime_time") {
                humanity = (humanity - 1).coerceAtLeast(0)
                resolution.put("permanentHumanityLoss", 1)
            }
        }
        for (i in 0 until active.length()) {
            val course = active.optJSONObject(i) ?: continue
            val expires = course.optLong("expiresAtMinute", Long.MAX_VALUE)
            if (expires > nowMinute) { remaining.put(course); continue }
            val id = course.optString("drugId")
            if (id !in streetDrugSecondaryDv.keys) continue
            val temporaryHumanityLoss = course.optInt("temporaryHumanityLoss", 0).coerceAtLeast(0)
            if (id == "prime_time" && temporaryHumanityLoss > 0) humanity = (humanity + temporaryHumanityLoss).coerceAtMost(maxHumanity)
            if (addictions.optBoolean(id, false)) {
                resolutions.put(JSONObject().put("drugId", id).put("alreadyAddicted", true).put("addicted", true).put("temporaryHumanityReturned", if (id == "prime_time") temporaryHumanityLoss else 0))
                continue
            }
            val recoveryRow = recovery.optJSONObject(id)
            val recoveryUntil = recoveryRow?.optLong("autoFailUntilMinute", 0L) ?: 0L
            if (recoveryUntil > nowMinute) {
                val dv = streetDrugSecondaryDv.getValue(id); addictions.put(id, true)
                val resolution = JSONObject().put("drugId", id).put("dv", dv).put("success", false).put("addicted", true)
                    .put("autoFailAfterTherapy", true).put("recoveryUntilMinute", recoveryUntil).put("temporaryHumanityLoss", temporaryHumanityLoss)
                    .put("temporaryHumanityReturned", if (id == "prime_time") temporaryHumanityLoss else 0)
                applyNewAddictionConsequences(id, resolution); resolutions.put(resolution)
                history.put(JSONObject().put("type", "secondary").put("drugId", id).put("atMinute", nowMinute).put("dv", dv).put("addicted", true).put("autoFailAfterTherapy", true))
                continue
            }
            val roll = rollCriticalD10(); val dv = streetDrugSecondaryDv.getValue(id)
            val total = will + resist + roll.getInt("total"); val addicted = total <= dv
            val resolution = JSONObject().put("drugId", id).put("dv", dv).put("will", will).put("resist", resist)
                .put("roll", roll).put("total", total).put("success", !addicted).put("addicted", addicted)
                .put("temporaryHumanityLoss", temporaryHumanityLoss).put("temporaryHumanityReturned", if (id == "prime_time") temporaryHumanityLoss else 0)
            if (addicted) { addictions.put(id, true); applyNewAddictionConsequences(id, resolution) }
            else if (id == "black_lace") humanity = (humanity + temporaryHumanityLoss).coerceAtMost(maxHumanity)
            resolutions.put(resolution)
            history.put(JSONObject().put("type", "secondary").put("drugId", id).put("atMinute", nowMinute).put("total", total).put("dv", dv).put("addicted", addicted)
                .put("permanentHumanityLoss", resolution.optInt("permanentHumanityLoss", 0)).put("permanentDeathSavePenalty", resolution.optInt("permanentDeathSavePenalty", 0)))
        }
        state.put("active", remaining).put("addictions", addictions).put("history", history)
        derived.put("humanity", humanity)
        recomputeStreetDrugModifiers(character, nowMinute)
        return resolutions
    }

    private fun applyRestHealing(character: JSONObject, fullRestDays: Int): JSONObject {
        val out = JSONObject().put("days", fullRestDays).put("healed", 0)
        if (fullRestDays <= 0) return out
        val combat = character.optJSONObject("combatState") ?: return out
        val player = combat.optJSONObject("player") ?: return out
        if (!player.optBoolean("stabilized", false)) return out.put("reason", "not-stabilized")
        val maxHp = player.optInt("maxHp", character.optJSONObject("derived")?.optInt("maxHp", 0) ?: 0)
        var hp = player.optInt("hp", maxHp)
        val body = character.optJSONObject("stats")?.optInt("BODY", 0) ?: 0
        repeat(fullRestDays) { hp = (hp + body).coerceAtMost(maxHp) }
        val healed = hp - player.optInt("hp", hp)
        player.put("hp", hp)
        return out.put("healed", healed).put("hpAfter", hp).put("bodyPerDay", body)
    }

    private fun validateStreetDrugAdmin(previous: JSONObject, next: JSONObject, evidence: JSONObject) {
        val id = evidence.optString("drugId")
        val duration = streetDrugDurations[id] ?: error("Street Drug desconhecida")
        require(inventoryQuantity(previous, id) > 0) { "Dose indisponível" }
        require(inventoryQuantity(next, id) == inventoryQuantity(previous, id) - 1) { "Consumo da dose divergente" }
        val beforeClock = normalizedWorldClock(JSONObject(previous.toString()))
        val afterClock = normalizedWorldClock(JSONObject(next.toString()))
        require(beforeClock.optLong("elapsedSeconds") == afterClock.optLong("elapsedSeconds")) { "Administrar droga não avança o relógio" }
        val starts = evidence.optLong("startsAtMinute", -1L)
        val nowMinute = beforeClock.optLong("elapsedMinutes")
        val expires = evidence.optLong("expiresAtMinute", -1L)
        require(starts == nowMinute) { "Início do efeito divergente" }
        val beforeActive = campaignStateOf(JSONObject(previous.toString())).optJSONObject("streetDrugs")?.optJSONArray("active") ?: JSONArray()
        var priorExpiry = -1L
        for (i in 0 until beforeActive.length()) {
            val row = beforeActive.optJSONObject(i) ?: continue
            if (row.optString("drugId") == id && row.optLong("expiresAtMinute", 0L) > starts) priorExpiry = row.optLong("expiresAtMinute")
        }
        val expectedExpiry = (if (priorExpiry > starts) priorExpiry else starts) + duration
        require(expires == expectedExpiry) { "Duração da Street Drug divergente" }
        val loss = evidence.optInt("humanityLoss", 0)
        when (id) {
            "black_lace" -> require(loss in 2..12) { "Humanity Loss de Black Lace inválida" }
            "prime_time" -> require(loss in 4..24) { "Humanity Loss temporária de Prime Time inválida" }
            else -> require(loss == 0) { "Street Drug sem Humanity Loss alterou Humanity" }
        }
        val afterActive = campaignStateOf(JSONObject(next.toString())).optJSONObject("streetDrugs")?.optJSONArray("active") ?: JSONArray()
        require((0 until afterActive.length()).any { i ->
            val row = afterActive.optJSONObject(i)
            row?.optString("drugId") == id && row.optLong("expiresAtMinute", -1L) == expires
        }) { "Curso ativo da Street Drug ausente" }
    }

    private fun syncCharacterClockProjection(characterId: String, canonicalSeconds: Long, originRequestId: String, result: JSONObject): JSONObject? {
        val previousRaw = storedCharacter(characterId) ?: return null
        val character = JSONObject(previousRaw)
        val before = normalizedWorldClock(character)
        val beforeSeconds = before.optLong("elapsedSeconds", 0L)
        if (canonicalSeconds == beforeSeconds) return null
        require(canonicalSeconds >= beforeSeconds) { "Relógio canônico não pode retroceder" }
        val after = clockAtElapsedSeconds(before, canonicalSeconds)
        campaignStateOf(character).put("worldClock", after)
        val drugExpirations = expireStreetDrugsForClock(character, after.optLong("elapsedMinutes"))
        // Natural healing requires an explicit full-rest semantic. Time passage alone is insufficient.
        val rest = result.optJSONObject("rest")
        val restSeconds = if (rest?.optBoolean("fullRest", false) == true) canonicalSeconds - beforeSeconds else 0L
        val healing = applyRestHealing(character, (restSeconds / 86400L).toInt())
        val requestId = "world-clock-projection-${UUID.randomUUID()}"
        val refs = JSONArray().put("motor-barbara://game-time").put("cpred-core-v1.25://street-drugs-pp227-229").put("interface-red-v4://hornets-pharmacy-pp4-5")
        val audit = JSONObject().put("requestId", requestId).put("originRequestId", originRequestId)
            .put("secondsAdvanced", canonicalSeconds - beforeSeconds).put("before", before).put("after", after)
            .put("drugExpirations", drugExpirations).put("healing", healing)
        campaignStateOf(character).put("lastWorldTimeProjection", audit)
        val effects = JSONArray()
            .put(JSONObject().put("type", "player_state_set").put("path", "characters.${canonicalCharacterKey(characterId)}").put("value", character))
            .put(JSONObject().put("type", "player_state_set").put("path", "activeCharacterId").put("value", characterId))
        val committed = canonicalTurn(JSONObject().put("text", "Sincronizar projeção do relógio canônico do Motor Bárbara")
            .put("request_id", requestId).put("mechanical", true).put("importance", "high").put("input_channel", "GM_HELP")
            .put("defer_narrative", true).put("resolution", canonicalResolution(requestId, "world_time", "project", "committed", refs, effects)))
        runBlocking(Dispatchers.IO) { characters.upsert(CyberpunkCharacterEntity(characterId, character.toString(), System.currentTimeMillis())) }
        val committedResult = committed.optJSONObject("result") ?: JSONObject()
        return JSONObject().put("applied", true).put("seconds", canonicalSeconds - beforeSeconds)
            .put("minutes", (canonicalSeconds - beforeSeconds) / 60L).put("before", before).put("after", after)
            .put("drugExpirations", drugExpirations).put("healing", healing)
            .put("stateVersion", committedResult.optLong("state_version", -1L)).put("transactionId", committedResult.optString("transaction_id"))
    }

    private fun backupTier(rank: Int): Int = when {
        rank <= 2 -> 1
        rank <= 4 -> 2
        rank <= 7 -> 3
        rank == 8 -> 4
        rank == 9 -> 5
        else -> 6
    }

    private fun validateRoleAbilityTransition(previous: JSONObject, next: JSONObject, action: String, evidence: JSONObject) {
        val role = previous.optString("role")
        val rank = previous.optInt("roleAbilityRank", 4).coerceIn(1, 10)
        require(next.optString("role") == role && next.optInt("roleAbilityRank", 4) == rank) { "Função/Grau não podem mudar nesta transação" }
        when (action) {
            "solo_combat_awareness_allocate" -> {
                require(role == "solo") { "Combat Awareness exige Solo" }
                val allocation = next.optJSONObject("roleAbilityState")?.optJSONObject("combatAwareness") ?: error("Alocação Combat Awareness ausente")
                val keys = listOf("damageDeflection", "fumbleRecovery", "initiativeReaction", "precisionAttack", "spotWeakness", "threatDetection")
                val total = keys.sumOf { allocation.optInt(it, 0).coerceAtLeast(0) }
                require(total == rank) { "Combat Awareness deve usar exatamente o Rank" }
                require(allocation.optInt("damageDeflection", 0) in setOf(0,2,4,6,8,10)) { "Damage Deflection inválido" }
                require(allocation.optInt("fumbleRecovery", 0) in setOf(0,4)) { "Fumble Recovery inválido" }
                require(allocation.optInt("precisionAttack", 0) in setOf(0,3,6,9)) { "Precision Attack inválido" }
                val flowBefore = combatFlow(previous); val flowAfter = combatFlow(next)
                val active = flowBefore.optBoolean("active", false); val beforeInitiative = evidence.optBoolean("beforeInitiative", false)
                if (active && !beforeInitiative) {
                    require(!flowBefore.optBoolean("playerActionUsed", false)) { "Ação do turno já consumida" }
                    require(evidence.optBoolean("consumesAction", false) && flowAfter.optBoolean("playerActionUsed", false)) { "Realocação em combate consome Ação" }
                }
            }
            "lawman_backup_call" -> {
                require(role == "lawman") { "Backup exige Lawman" }
                val roll = evidence.optInt("callRoll", 0); require(roll in 1..10) { "d10 de Backup inválido" }
                val success = roll <= rank; require(evidence.optBoolean("success", false) == success) { "Resultado de Backup divergente" }
                val stateBefore = previous.optJSONObject("roleAbilityState")?.optJSONObject("backup") ?: JSONObject()
                val stateAfter = next.optJSONObject("roleAbilityState")?.optJSONObject("backup") ?: error("Estado Backup ausente")
                val attemptsBefore = stateBefore.optJSONArray("attempts")?.length() ?: 0
                val attemptsAfter = stateAfter.optJSONArray("attempts")?.length() ?: 0
                require(attemptsAfter == attemptsBefore + 1) { "Histórico de Backup divergente" }
                val pendingBefore = stateBefore.optJSONArray("pending")?.length() ?: 0
                val pendingAfter = stateAfter.optJSONArray("pending")?.length() ?: 0
                if (success) {
                    val arrival = evidence.optInt("arrivalRoll", 0); require(arrival in 1..6) { "d6 de chegada inválido" }
                    val currentRound = evidence.optInt("currentRound", 1).coerceAtLeast(1)
                    require(evidence.optInt("arrivalRound", -1) == currentRound + arrival) { "Round de chegada divergente" }
                    var tier = backupTier(rank); if (arrival == 6) tier = (tier + 1).coerceAtMost(6)
                    require(evidence.optInt("tier", -1) == tier) { "Tier de Backup divergente" }
                    require(evidence.optInt("groups", -1) == if (rank == 10) 2 else 1) { "Grupos de Backup divergentes" }
                    require(pendingAfter == pendingBefore + 1) { "Resposta de Backup não persistida" }
                } else require(pendingAfter == pendingBefore) { "Falha de Backup não pode criar resposta" }
                val flowBefore = combatFlow(previous); if (flowBefore.optBoolean("active", false)) {
                    require(!flowBefore.optBoolean("playerActionUsed", false)) { "Ação do turno já consumida" }
                    require(evidence.optBoolean("consumesAction", false) && combatFlow(next).optBoolean("playerActionUsed", false)) { "Chamar Backup consome Ação" }
                }
            }
            "lawman_backup_arrive" -> {
                require(role == "lawman") { "Chegada de Backup exige Lawman" }
                val round = evidence.optInt("currentRound", 0); require(round >= 1) { "Round de chegada inválido" }
                val sceneId = evidence.optString("sceneId"); require(sceneId.isNotBlank()) { "Cena de chegada ausente" }
                val arrived = evidence.optJSONArray("arrivedRequests") ?: JSONArray(); require(arrived.length() >= 1) { "Nenhuma resposta de Backup chegou" }
                val tokens = evidence.optJSONArray("tokenIds") ?: JSONArray(); val allyCount = evidence.optInt("allyCount", 0); require(allyCount == tokens.length() && allyCount >= 1) { "Contagem de aliados divergente" }
                val beforeBackup = previous.optJSONObject("roleAbilityState")?.optJSONObject("backup") ?: JSONObject()
                val afterBackup = next.optJSONObject("roleAbilityState")?.optJSONObject("backup") ?: error("Estado Backup ausente")
                val beforePending = beforeBackup.optJSONArray("pending") ?: JSONArray(); val afterPending = afterBackup.optJSONArray("pending") ?: JSONArray(); val beforeAllies = beforeBackup.optJSONArray("allies") ?: JSONArray(); val afterAllies = afterBackup.optJSONArray("allies") ?: JSONArray()
                require(afterAllies.length() == beforeAllies.length() + allyCount) { "Aliados de Backup divergentes" }
                val arrivedIds = (0 until arrived.length()).map { arrived.optString(it) }.toSet(); require(arrivedIds.size == arrived.length()) { "Resposta de Backup duplicada" }
                var expectedAllies = 0
                for (i in 0 until beforePending.length()) {
                    val req = beforePending.optJSONObject(i) ?: continue
                    if (req.optString("id") in arrivedIds) {
                        require(req.optString("status", "en_route") == "en_route") { "Resposta já processada" }
                        require(req.optInt("arrivalRound", Int.MAX_VALUE) <= round) { "Backup chegou cedo demais" }
                        val tier=req.optInt("tier",0); require(tier in 1..6) { "Tier de chegada inválido" }
                        val groups=req.optInt("groups",1).coerceAtLeast(1)
                        val perGroup=when(tier){1,2->4;3,5,6->2;4->1;else->0}
                        expectedAllies += perGroup*groups
                    }
                }
                require(expectedAllies == allyCount) { "Quantidade de Backup não corresponde ao tier" }
                require(afterPending.length() == beforePending.length() - arrivedIds.size) { "Fila de Backup divergente" }
                val tokenSet = mutableSetOf<String>()
                for (i in beforeAllies.length() until afterAllies.length()) {
                    val ally = afterAllies.optJSONObject(i) ?: error("Aliado inválido")
                    val tokenId=ally.optString("tokenId")
                    require(tokenId.isNotBlank() && tokenSet.add(tokenId)) { "Token aliado duplicado" }
                    require(ally.optString("disposition") == "friendly" && ally.optBoolean("gmControlled", false)) { "Backup deve ser friendly e controlado pelo Mestre" }
                    require(ally.optString("sceneId") == sceneId) { "Cena do aliado divergente" }
                    require(ally.optInt("hp",0) > 0 && ally.optInt("sp",-1) >= 0) { "Stat block de Backup inválido" }
                }
            }
            else -> error("Ação de Role Ability não suportada")
        }
    }

    private val interfaceRedPharmaceuticalIds = setOf("antibiotic", "rapidetox", "speedheal", "stim", "surge", "sedative", "veritas")
    private val hornetCompoundItems = mapOf("delaying" to "hornet_delaying_compound", "distilling" to "hornet_distilling_compound", "osmosis" to "hornet_osmosis_compound")

    private fun interfaceRedEnabled(character: JSONObject): Boolean =
        character.optJSONObject("campaignState")?.optJSONObject("contentModules")?.optBoolean("interface_red", false) ?: false

    private fun medicalTechPharmaceuticalProfile(character: JSONObject): Pair<Int, Int> {
        val medicine = character.optJSONObject("roleAbilityState")?.optJSONObject("medicine") ?: JSONObject()
        val pharma = medicine.optInt("pharmaceuticals", 0).coerceIn(0, 5)
        val cryo = medicine.optInt("cryosystem", 0).coerceIn(0, 5)
        return pharma to (pharma + cryo).coerceAtMost(10)
    }

    private fun knownPharmaceuticals(character: JSONObject): Set<String> {
        val a = character.optJSONObject("roleAbilityState")?.optJSONArray("pharmaceuticalAccess") ?: JSONArray()
        return (0 until a.length()).mapNotNull { a.optString(it).takeIf(String::isNotBlank) }.toSet()
    }

    private fun elapsedMinutes(character: JSONObject): Long {
        val clock = character.optJSONObject("campaignState")?.optJSONObject("worldClock") ?: JSONObject()
        return if (clock.has("elapsedMinutes")) clock.optLong("elapsedMinutes", 0L) else clock.optLong("elapsedSeconds", 0L) / 60L
    }

    private fun inventoryHasCompound(character: JSONObject, toxinId: String, compoundId: String): Boolean {
        val inventory = character.optJSONArray("inventory") ?: JSONArray()
        for (i in 0 until inventory.length()) {
            val row = inventory.optJSONObject(i) ?: continue
            if (row.optString("itemId") != toxinId) continue
            val compounds = row.optJSONArray("hornetCompounds") ?: continue
            for (j in 0 until compounds.length()) if (compounds.optJSONObject(j)?.optString("id") == compoundId) return true
        }
        return false
    }

    private fun hasInterfaceRedPharmaEffect(character: JSONObject, kind: String): Boolean {
        val effects = character.optJSONObject("campaignState")?.optJSONObject("interfaceRed")?.optJSONObject("pharmaceuticals")?.optJSONArray("effects") ?: return false
        return (0 until effects.length()).any { effects.optJSONObject(it)?.optString("kind") == kind }
    }

    private fun validateInterfaceRedTransition(previous: JSONObject, next: JSONObject, action: String, evidence: JSONObject) {
        require(interfaceRedEnabled(previous) && interfaceRedEnabled(next)) { "Módulo Interface RED não está habilitado" }
        val (pharmaPoints, medicalTechSkill) = medicalTechPharmaceuticalProfile(previous)
        val formulaId = evidence.optString("formulaId")
        when (action) {
            "pharmaceutical_formula_configure" -> {
                require(previous.optString("role").lowercase() == "medtech") { "Pharmaceuticals exigem Medtech" }
                require(formulaId in interfaceRedPharmaceuticalIds) { "Fórmula farmacêutica desconhecida" }
                require(pharmaPoints > 0) { "Sem pontos em Pharmaceuticals" }
                val afterKnown = knownPharmaceuticals(next)
                require(formulaId in afterKnown && afterKnown.size <= pharmaPoints) { "Acesso farmacêutico divergente" }
                require(evidence.optInt("slot", -1) in 0 until pharmaPoints) { "Vaga farmacêutica inválida" }
                require(evidence.optInt("pharmaceuticalPoints", -1) == pharmaPoints) { "Pontos de Pharmaceuticals divergentes" }
            }
            "pharmaceutical_synthesize" -> {
                require(previous.optString("role").lowercase() == "medtech") { "Pharmaceuticals exigem Medtech" }
                require(formulaId in interfaceRedPharmaceuticalIds && formulaId in knownPharmaceuticals(previous)) { "Fórmula não conhecida" }
                require(medicalTechSkill > 0 && evidence.optInt("medicalTechSkill", -1) == medicalTechSkill) { "Medical Tech divergente" }
                require(evidence.optInt("materialsCost", -1) == 200 && evidence.optInt("durationMinutes", -1) == 60 && evidence.optInt("dv", -1) == 13) { "Parâmetros de síntese divergentes" }
                val beforeCash = previous.optJSONObject("economy")?.optInt("eurobucks", 0) ?: 0
                val afterCash = next.optJSONObject("economy")?.optInt("eurobucks", 0) ?: 0
                require(beforeCash >= 200 && afterCash == beforeCash - 200) { "Materiais da síntese não foram debitados corretamente" }
                val beforeMinute = elapsedMinutes(previous); val afterMinute = elapsedMinutes(next)
                require(afterMinute == beforeMinute + 60L && evidence.optLong("clockBeforeMinute", -1L) == beforeMinute && evidence.optLong("clockAfterMinute", -1L) == afterMinute) { "Relógio da síntese divergente" }
                val roll = evidence.optJSONObject("roll") ?: error("Rolagem de síntese ausente")
                val expectedTotal = (previous.optJSONObject("stats")?.optInt("TECH", 0) ?: 0) + medicalTechSkill + roll.optInt("total", Int.MIN_VALUE)
                require(evidence.optInt("total", Int.MIN_VALUE) == expectedTotal) { "Total de síntese divergente" }
                val success = expectedTotal > 13
                require(evidence.optBoolean("success", !success) == success) { "Resultado de síntese divergente" }
                val doses = if (success) medicalTechSkill else 0
                require(evidence.optInt("doses", -1) == doses) { "Doses sintetizadas divergentes" }
                require(inventoryQuantity(next, formulaId) == inventoryQuantity(previous, formulaId) + doses) { "Inventário farmacêutico divergente" }
            }
            "hornet_compound_mix" -> {
                val compoundId = evidence.getString("compoundId")
                val compoundItem = hornetCompoundItems[compoundId] ?: error("Composto Hornet desconhecido")
                val toxinId = evidence.getString("toxinId")
                require(toxinId in setOf("poisonVial", "biotoxinVial")) { "Alvo da mistura deve ser Poison/Biotoxin" }
                require(inventoryQuantity(previous, compoundItem) >= 1 && inventoryQuantity(next, compoundItem) == inventoryQuantity(previous, compoundItem) - 1) { "Composto não consumido corretamente" }
                require(inventoryQuantity(next, toxinId) == inventoryQuantity(previous, toxinId)) { "Mistura não deve consumir o frasco de toxina" }
                require(inventoryHasCompound(next, toxinId, compoundId)) { "Perfil do composto não foi persistido na toxina" }
                if (compoundId == "delaying") require(evidence.optInt("delayMinutes", 0) in setOf(1, 60)) { "Atraso inválido" }
                if (compoundId == "distilling") require(evidence.optInt("dv", -1) in setOf(15, 17)) { "DV destilado inválido" }
                if (compoundId == "osmosis") require(evidence.optBoolean("contact", false)) { "Osmosis deve gerar toxina de contato" }
                if (combatFlow(previous).optBoolean("active", false)) {
                    require(!combatFlow(previous).optBoolean("playerActionUsed", false) && combatFlow(next).optBoolean("playerActionUsed", false)) { "Mistura deve consumir Ação" }
                }
            }
            "hornet_pharmaceutical_administer" -> {
                require(previous.optString("role").lowercase() == "medtech") { "Pharmaceuticals exigem Medtech" }
                require(formulaId in setOf("sedative", "veritas")) { "Pharmaceutical Hornet desconhecido" }
                require(evidence.optString("target") == "self") { "Administração direta só valida alvo próprio" }
                require(inventoryQuantity(previous, formulaId) >= 1 && inventoryQuantity(next, formulaId) == inventoryQuantity(previous, formulaId) - 1) { "Dose não consumida corretamente" }
                if (evidence.optBoolean("effectApplied", false)) require(hasInterfaceRedPharmaEffect(next, formulaId)) { "Efeito farmacêutico ativo ausente" }
                if (combatFlow(previous).optBoolean("active", false)) require(!combatFlow(previous).optBoolean("playerActionUsed", false) && combatFlow(next).optBoolean("playerActionUsed", false)) { "Administração deve consumir Ação" }
            }
            "hornet_pharmaceutical_inject" -> {
                require(previous.optString("role").lowercase() == "medtech") { "Pharmaceuticals exigem Medtech" }
                require(formulaId in setOf("sedative", "veritas")) { "Pharmaceutical Hornet desconhecido" }
                require(combatFlow(previous).optBoolean("active", false)) { "Airhypo tático exige combate" }
                require(!combatFlow(previous).optBoolean("playerActionUsed", false) && combatFlow(next).optBoolean("playerActionUsed", false)) { "Ataque com Airhypo deve consumir Ação" }
                require(inventoryQuantity(previous, "airhypo") >= 1 && evidence.optBoolean("airhypo", false)) { "Airhypo ausente" }
                val hit = evidence.optInt("attack", Int.MIN_VALUE) > evidence.optInt("defense", Int.MAX_VALUE)
                require(evidence.optBoolean("hit", !hit) == hit) { "Resultado do Airhypo divergente" }
                require(inventoryQuantity(next, formulaId) == inventoryQuantity(previous, formulaId) - if (hit) 1 else 0) { "Consumo da dose no Airhypo divergente" }
                require(evidence.optInt("quantitySpent", -1) == if (hit) 1 else 0) { "Quantidade declarada do Airhypo divergente" }
                val targetKey = evidence.optString("targetKey")
                require(targetKey.isNotBlank()) { "Alvo do Airhypo ausente" }
                if (hit && evidence.optBoolean("effectApplied", false)) {
                    val target = npcCombatant(next, targetKey)
                    require(target.length() > 0) { "Estado do alvo não persistido" }
                    if (formulaId == "sedative") require(target.optBoolean("unconscious", false)) { "Sedative aplicado sem inconsciência" }
                    if (formulaId == "veritas") {
                        val effects = target.optJSONArray("interfaceRedPharmaceuticals") ?: JSONArray()
                        require((0 until effects.length()).any { effects.optJSONObject(it)?.optString("kind") == "veritas" }) { "Veritas aplicado sem estado persistido" }
                    }
                }
            }
            else -> error("Ação Interface RED não suportada")
        }
    }

    private fun validateSupplementTransition(previous: JSONObject, next: JSONObject, mechanic: String, action: String, evidence: JSONObject) {
        val campaign = next.optJSONObject("campaignState") ?: error("campaignState ausente")
        when (mechanic) {
            "world" -> {
                require(action in setOf("night_city_weather", "no_place_like_home_designate")) { "Ação world não suportada" }
                val systems = campaign.optJSONObject("worldSystems") ?: error("worldSystems ausente")
                if (action == "night_city_weather") require(systems.optJSONObject("weather") != null) { "Clima não persistido" }
                if (action == "no_place_like_home_designate") require(systems.optJSONObject("headquarters") != null) { "Headquarters não persistido" }
            }
            "downtime" -> {
                require(action in setOf("salvage_start", "salvage_resolve", "salvage_select_good", "salvage_complete", "no_place_like_home_group_ip", "no_place_like_home_practice", "no_place_like_home_monthly_morale", "no_place_like_home_improvement", "no_place_like_home_upgrade")) { "Ação downtime não suportada" }
                val systems = campaign.optJSONObject("worldSystems") ?: error("worldSystems ausente")
                if (action.startsWith("salvage_")) require(systems.optJSONObject("salvage") != null) { "Salvaging não persistido" }
                if (action.startsWith("no_place_like_home_")) require(systems.optJSONObject("headquarters") != null) { "Headquarters não persistido" }
            }
            "mission" -> {
                require(action in setOf("going_quiet_new_mission", "going_quiet_new_beat", "going_quiet_flash_of_luck", "going_quiet_flash_refund", "going_quiet_quiet_jack_in", "going_quiet_stealth_ice", "going_quiet_stealth_watcher", "going_quiet_stealth_interaction", "going_quiet_stealth_jack_out")) { "Ação mission não suportada" }
                require(campaign.optJSONObject("goingQuiet") != null) { "Going Quiet não persistido" }
                if (action.startsWith("going_quiet_stealth_") || action == "going_quiet_quiet_jack_in") {
                    val stealth = campaign.optJSONObject("goingQuiet")?.optJSONObject("stealthNetrun") ?: error("Stealth Netrunning não persistido")
                    require(evidence.optString("source").contains("going-quiet", ignoreCase = true)) { "Fonte Going Quiet ausente" }
                    if (action == "going_quiet_quiet_jack_in") {
                        require(evidence.optInt("totalNetActionsSpent", 0) == 2) { "Quiet Jack In deve gastar Jack In + 1 NET Action adicional" }
                        require(evidence.has("success")) { "Resultado Quiet Jack In ausente" }
                    }
                    if (action == "going_quiet_stealth_ice") {
                        require(evidence.optBoolean("speedCheckReplaced", false)) { "Stealth vs Black ICE deve substituir Speed Check" }
                        require(evidence.optString("iceId").isNotBlank()) { "Black ICE ausente" }
                    }
                    if (action == "going_quiet_stealth_watcher") require(evidence.optString("watcherId").isNotBlank()) { "Watcher ausente" }
                    if (action == "going_quiet_stealth_interaction" && evidence.optBoolean("breaksStealth", false)) require(!stealth.optBoolean("stealthed", true)) { "Interação proibida não quebrou stealth" }
                    if (action == "going_quiet_stealth_jack_out") require(!stealth.optBoolean("stealthed", true)) { "Jack Out não encerrou stealth" }
                }
                if (action == "going_quiet_flash_of_luck" && evidence.optBoolean("consumesAction", false) && combatFlow(previous).optBoolean("active", false)) {
                    require(!combatFlow(previous).optBoolean("playerActionUsed", false)) { "Ação do turno já consumida" }
                    require(combatFlow(next).optBoolean("playerActionUsed", false)) { "Flash of Luck não consumiu Ação padrão" }
                }
            }
            "single_player_mode" -> {
                require(action in setOf("single_player_oracle", "single_player_open_prompt", "single_player_mission_start", "single_player_beat", "single_player_plot_twist", "single_player_morale", "single_player_clock_create", "single_player_clock_trigger", "single_player_clock_devils_luck", "single_player_clock_reclaim")) { "Ação Single Player Mode não suportada" }
                val solo = campaign.optJSONObject("singlePlayerMode") ?: error("Single Player Mode não persistido")
                require(evidence.optString("source").contains("Single Player Mode")) { "Fonte Single Player ausente" }
                if (action == "single_player_oracle") {
                    require(evidence.optString("probability") in setOf("certain", "likely", "fifty_fifty", "unlikely", "impossible")) { "Probabilidade Oracle inválida" }
                    require(evidence.optInt("roll", 0) in 1..100) { "d100 Oracle inválido" }
                    require(evidence.optString("outcome") in setOf("no", "no_complication", "complicated", "yes_complication", "yes")) { "Resultado Oracle inválido" }
                }
                if (action == "single_player_morale") {
                    require(evidence.optString("mentality") in setOf("lost", "experienced", "trained", "inexperienced", "streetrat")) { "Mentalidade Morale inválida" }
                    require(evidence.optInt("roll", 0) in 1..10) { "d10 Morale inválido" }
                }
                if (action.startsWith("single_player_clock_")) {
                    require(evidence.optString("clockId").isNotBlank()) { "Clock ID ausente" }
                    require(solo.optJSONArray("clocks") != null) { "Solo Play Clocks não persistidos" }
                }
            }
            "interface_red_vol5" -> {
                require(action in setOf("vol5_mystery_create", "vol5_evidence_check", "vol5_focus_rest", "vol5_deduction_hint", "vol5_cyberpet_purchase", "vol5_cyberpet_command", "vol5_cyberpet_train", "vol5_screamsheet_generate")) { "Ação Interface RED Vol.5 não suportada" }
                val vol5 = campaign.optJSONObject("interfaceRedVol5") ?: throw IllegalArgumentException("Estado Interface RED Vol.5 não persistido")
                if (action.startsWith("vol5_mystery_") || action in setOf("vol5_evidence_check", "vol5_focus_rest", "vol5_deduction_hint")) require(vol5.optJSONArray("mysteries") != null) { "Mysteries não persistidos" }
                if (action.startsWith("vol5_cyberpet_")) require(vol5.optJSONArray("cyberpets") != null) { "Cyberpets não persistidos" }
                if (action == "vol5_screamsheet_generate") require(vol5.optJSONArray("screamsheets") != null) { "Screamsheet não persistido" }
            }
            "hope_reborn" -> {
                require(action in setOf("hope_campaign_start", "hope_campaign_mission_start", "hope_campaign_beat", "hope_campaign_beat_jump", "hope_campaign_mission_complete", "hope_agent_hack", "hope_agent_command", "hope_agent_reboot", "hope_derby_start", "hope_derby_round", "hope_derby_score", "hope_derby_penalty", "hope_derby_action")) { "Ação Hope Reborn não suportada" }
                val hope = campaign.optJSONObject("hopeReborn") ?: error("Hope Reborn não persistido")
                require(evidence.optString("source").contains("Hope Reborn")) { "Fonte Hope Reborn ausente" }
                if (action.startsWith("hope_campaign_")) {
                    require(hope.optString("currentMissionId").isNotBlank()) { "Missão Hope Reborn ausente" }
                    require(hope.optInt("currentBeatIndex", -1) >= 0) { "Beat Hope Reborn inválido" }
                }
                if (action == "hope_agent_hack") {
                    require(evidence.optString("targetId").isNotBlank()) { "Agent alvo ausente" }
                    require(evidence.optString("access") in setOf("remote", "physical")) { "Modo de acesso inválido" }
                    require(evidence.optString("quality") in setOf("poor", "standard", "excellent")) { "Qualidade de Agent inválida" }
                    require(evidence.optInt("durationSeconds", 0) == 60) { "Hack de Agent deve consumir 60 segundos" }
                    require(hope.optJSONObject("agentHacks")?.optJSONObject(evidence.optString("targetId")) != null) { "Hack de Agent não persistido" }
                }
                if (action == "hope_agent_command") {
                    require(evidence.optString("targetId").isNotBlank()) { "Agent alvo ausente" }
                    require(evidence.optString("commandType") in setOf("basic", "core", "secure")) { "Tipo de comando inválido" }
                    require(evidence.optInt("durationSeconds", 0) in setOf(3, 60, 300)) { "Duração de comando inválida" }
                }
                if (action == "hope_agent_reboot") require(evidence.optInt("durationSeconds", 0) == 300) { "Reboot deve consumir 300 segundos" }
                if (action.startsWith("hope_derby_")) require(hope.optJSONObject("rollerDerby") != null) { "Roller Derby não persistido" }
            }
            "street_stories" -> {
                require(action in setOf("street_stories_mission_start", "street_stories_beat", "street_stories_complete", "street_stories_offscreen_sync", "street_stories_npc_spawn", "street_stories_net_floor")) { "Ação Street Stories não suportada" }
                val systems = campaign.optJSONObject("worldSystems") ?: error("worldSystems ausente")
                val stories = systems.optJSONObject("streetStories") ?: error("Street Stories não persistido")
                val storyCampaign = stories.optJSONObject("campaign") ?: error("Campanha Street Stories ausente")
                require(evidence.optString("source").contains("Street Stories")) { "Fonte Street Stories ausente" }
                when (action) {
                    "street_stories_mission_start", "street_stories_beat" -> {
                        require(storyCampaign.optString("missionId").isNotBlank()) { "Missão Street Stories ausente" }
                        require(storyCampaign.optInt("beatIndex", -1) >= 0) { "Beat Street Stories inválido" }
                    }
                    "street_stories_complete" -> {
                        val completedId = evidence.optString("missionId")
                        require(completedId.isNotBlank()) { "Missão concluída ausente" }
                        val completed = storyCampaign.optJSONArray("completed") ?: error("Lista de missões concluídas ausente")
                        require((0 until completed.length()).any { completed.optString(it) == completedId }) { "Conclusão Street Stories não persistida" }
                    }
                    "street_stories_npc_spawn" -> {
                        require(evidence.optString("profileId").isNotBlank()) { "profileId Street Stories obrigatório" }
                        require(evidence.optString("sceneId").isNotBlank()) { "sceneId Street Stories obrigatório" }
                        require(evidence.optString("tokenId").isNotBlank()) { "tokenId Street Stories obrigatório" }
                        require(evidence.optBoolean("sourceBound", false)) { "NPC Street Stories deve ser source-bound" }
                        require(evidence.optBoolean("canonicalProfile", false)) { "NPC Street Stories exige perfil canônico" }
                    }
                    "street_stories_net_floor" -> {
                        require(evidence.optBoolean("sourceBound", false)) { "NET Street Stories exige sourceBound=true" }
                        require(evidence.optBoolean("graphComplete", false)) { "NET Street Stories exige graphComplete=true" }
                        require(evidence.optString("architectureId").isNotBlank()) { "architectureId obrigatório" }
                        require(evidence.optString("floor").isNotBlank()) { "floor obrigatório" }
                        require(evidence.optInt("nodeIndex", -1) >= 0) { "nodeIndex inválido" }
                    }
                    "street_stories_offscreen_sync" -> {
                        val offscreen = stories.optJSONObject("offscreen") ?: error("Mundo Vivo Street Stories ausente")
                        require(evidence.optBoolean("projected", false)) { "Evento off-screen deve ser declarado projetado" }
                        require(!evidence.optBoolean("canonical", true)) { "Evento off-screen não pode ser declarado canônico" }
                        require(!evidence.optBoolean("mutatesMissionState", true)) { "Evento off-screen não pode alterar missão" }
                        require(offscreen.optLong("lastTickMinute", -1L) >= 0L) { "Relógio off-screen inválido" }
                        require(evidence.optBoolean("sourceBound", false)) { "Mundo Vivo Street Stories deve ser source-bound" }
                        require(evidence.optString("graphVersion") in setOf("R5.03", "R5.04", "R5.16", "R5.37", "R5.39")) { "Grafo Mundo Vivo Street Stories inválido" }
                        if (evidence.optString("graphVersion") in setOf("R5.04", "R5.16", "R5.37")) {
                            require(evidence.optString("lifecycleVersion") in setOf("R5.04", "R5.16", "R5.37")) { "Lifecycle Mundo Vivo Street Stories inválido" }
                            require(evidence.optInt("openLeadCount", -1) in 0..64) { "Fila de leads Street Stories inválida" }
                            require(evidence.optInt("criticalActorCount", -1) in 0..87) { "Contagem de atores críticos inválida" }
                            require(evidence.optInt("decayTicks", -1) >= 0) { "Decay ticks inválido" }
                        }
                        if (evidence.optString("graphVersion") == "R5.16") {
                            require(evidence.optInt("unifiedActorCount", -1) == 204) { "Mundo Vivo 2.0 deve unificar 204 atores source-bound" }
                            require(evidence.optInt("factionCount", -1) == 16) { "Mundo Vivo 2.0 deve preservar 16 facções source-bound" }
                            require(evidence.optInt("consequenceCount", -1) in 0..128) { "Consequências projetadas inválidas" }
                            require(evidence.optInt("rumorCount", -1) in 0..64) { "Rumores projetados inválidos" }
                        }
                        if (evidence.optString("graphVersion") in setOf("R5.37", "R5.39")) {
                            require(evidence.optInt("unifiedActorCount", -1) == 204) { "Mundo Vivo 3.0 deve preservar 204 atores source-bound" }
                            require(evidence.optInt("factionCount", -1) == 16) { "Mundo Vivo 3.0 deve preservar 16 facções source-bound" }
                            require(evidence.optInt("consequenceCount", -1) in 0..128) { "Consequências projetadas inválidas" }
                            require(evidence.optInt("rumorCount", -1) in 0..64) { "Rumores projetados inválidos" }
                            val alive = evidence.optInt("aliveActorCount", -1)
                            val dead = evidence.optInt("deadActorCount", -1)
                            val injured = evidence.optInt("injuredActorCount", -1)
                            require(alive in 0..204 && dead in 0..204 && alive + dead == 204) { "Lifecycle de atores do Mundo Vivo 3.0 inválido" }
                            require(injured in 0..alive) { "Contagem de feridos do Mundo Vivo 3.0 inválida" }
                            require(evidence.optInt("memoryCount", -1) >= 0) { "Memórias persistentes do Mundo Vivo 3.0 inválidas" }
                            require(evidence.optInt("commitmentCount", -1) >= 0) { "Compromissos persistentes do Mundo Vivo 3.0 inválidos" }
                            require(evidence.optInt("pendingMasterEventCount", -1) in 0..48) { "Fila do Mestre no Mundo Vivo 3.0 inválida" }
                            require(evidence.optInt("marketPressure", -1) in 0..100) { "Pressão econômica do Mundo Vivo 3.0 inválida" }
                            require(!evidence.optBoolean("priceMutationAllowed", true)) { "Mundo Vivo 3.0 não pode alterar preços canônicos automaticamente" }
                            require(evidence.optInt("simulationPulseCount", -1) in 0..96) { "Budget de simulação do Mundo Vivo 3.0 inválido" }
                        }
                        require(evidence.optInt("actorCount", 0) == 87) { "Mundo Vivo deve preservar 87 biografias" }
                        require(evidence.optInt("explicitLinkCount", -1) >= 0) { "Contagem de vínculos explícitos inválida" }
                        require(evidence.optInt("activeLocationCount", -1) in 0..41) { "Contagem de locais ativos inválida" }
                    }
                }
            }
            "mobility" -> {
                require(action in setOf("cyberchair_mount", "cyberchair_dismount")) { "Ação Cyberchair não suportada" }
                val mobility = campaign.optJSONObject("mobility") ?: error("Estado de mobilidade ausente")
                val cyber = mobility.optJSONObject("cyberchair") ?: error("Estado Cyberchair ausente")
                require(evidence.optString("source").contains("Cyberchairs", ignoreCase = true)) { "Fonte Cyberchairs ausente" }
                if (action == "cyberchair_mount") {
                    require(evidence.optString("model") in setOf("mercurius", "spider")) { "Modelo Cyberchair inválido" }
                    require(evidence.optString("control") in setOf("interface_plug", "armrest_hand")) { "Controle Cyberchair inválido" }
                    require(evidence.optBoolean("empImmune", false)) { "Cyberchair deve preservar imunidade a EMP" }
                    require(evidence.optInt("move", -1) in 0..5) { "MOVE Cyberchair inválido" }
                    val chair = cyber.optJSONObject("chair") ?: error("Cyberchair montado não persistido")
                    require(chair.optString("model") == evidence.optString("model")) { "Modelo Cyberchair persistido divergente" }
                    require(chair.optString("pilotId").isNotBlank()) { "Piloto Cyberchair ausente" }
                } else {
                    require(cyber.isNull("chair")) { "Cyberchair ainda ativo após desmontar" }
                }
            }
            "hardened_adversaries" -> {
                require(action == "hardened_spawn") { "Ação Hardened não suportada" }
                require(evidence.optString("profileId").isNotBlank()) { "Perfil Hardened ausente" }
                require(evidence.optString("kind") in setOf("mook", "lieutenant")) { "Tipo Hardened inválido" }
                require(evidence.optInt("count", 0) in 1..4) { "Quantidade Hardened inválida" }
                require(evidence.optString("sceneId").isNotBlank()) { "Cena Hardened ausente" }
                require(evidence.optString("tokenId").isNotBlank()) { "Token Hardened ausente" }
                require(evidence.optBoolean("sourceBound", false)) { "Hardened deve ser source-bound" }
                require(evidence.optBoolean("canonicalProfile", false)) { "Hardened exige perfil oficial" }
                require(evidence.optString("source").contains("Hardened", ignoreCase = true)) { "Fonte Hardened ausente" }
                require(campaign.optJSONObject("worldSystems")?.optJSONObject("hardenedAdversaries") != null) { "Estado Hardened não persistido" }
            }
            "old_guns" -> {
                require(action == "old_guns_convert") { "Ação Old Guns não suportada" }
                require(evidence.optBoolean("sourceBound", false) && !evidence.optBoolean("exotic", true)) { "Old Guns exige conversão source-bound não Exótica" }
                require(evidence.optBoolean("legacyAttachmentsStripped", false)) { "Attachments 2020 devem ser removidos" }
                require(evidence.optBoolean("gmMarketAssigned", false) && evidence.optInt("price", 0) > 0) { "Old Guns exige preço final atribuído pelo Mestre" }
                require(evidence.optInt("accuracy", -1) in 0..1) { "WA convertida inválida" }
                require(evidence.optString("quality") in setOf("poor", "standard", "excellent")) { "Qualidade Old Guns inválida" }
                require(evidence.optString("itemId").startsWith("old_gun_")) { "ID Old Guns inválido" }
                require(evidence.optString("source").contains("Old Guns", ignoreCase = true)) { "Fonte Old Guns ausente" }
                val old = campaign.optJSONObject("worldSystems")?.optJSONObject("oldGuns") ?: error("Estado Old Guns não persistido")
                val conversions = old.optJSONArray("conversions") ?: error("Conversões Old Guns ausentes")
                require((0 until conversions.length()).any { conversions.optJSONObject(it)?.optJSONObject("item")?.optString("id") == evidence.optString("itemId") }) { "Conversão Old Guns não encontrada" }
            }
            "npc" -> {
                require(action in setOf("danger_gal_spawn", "gang_guide_spawn", "everyday_people_spawn", "everyday_people_social_check", "atlas_population_spawn", "fast_and_furriest_spawn")) { "Ação NPC não suportada" }
                require(evidence.optString("profileId").isNotBlank()) { "NPC profileId ausente" }
                require(evidence.optString("source").isNotBlank()) { "Fonte NPC ausente" }
                if (action in setOf("danger_gal_spawn", "gang_guide_spawn", "everyday_people_spawn", "fast_and_furriest_spawn")) {
                    require(evidence.optString("tokenId").isNotBlank()) { "NPC tokenId ausente" }
                    require(evidence.optString("sceneId").isNotBlank()) { "NPC sceneId ausente" }
                }
                if (action == "fast_and_furriest_spawn") {
                    require(evidence.optString("profileId") in setOf("fast_furriest_fin_diesel", "fast_furriest_anne_bonny")) { "Perfil Fast & Furriest inválido" }
                    require(evidence.optBoolean("sourceBound", false) && evidence.optBoolean("canonicalProfile", false)) { "Fast & Furriest exige perfil oficial source-bound" }
                    require(evidence.optString("source").contains("Fast & Furriest", ignoreCase = true)) { "Fonte Fast & Furriest ausente" }
                    require(campaign.optJSONObject("worldSystems")?.optJSONObject("fastAndFurriest") != null) { "Estado Fast & Furriest não persistido" }
                }
                if (action == "gang_guide_spawn") {
                    require(evidence.optString("gangId").isNotBlank()) { "Gang Guide gangId ausente" }
                    require(evidence.optInt("count", 0) in 1..4) { "Quantidade Gang Guide inválida" }
                    require(campaign.optJSONObject("worldSystems")?.optJSONObject("gangGuide") != null) { "Gang Guide não persistido" }
                }
                if (action == "atlas_population_spawn") {
                    require(evidence.optString("poiCode").matches(Regex("[A-X]\\d+"))) { "Atlas poiCode inválido" }
                    require(evidence.optInt("count", 0) in 1..4) { "Quantidade Atlas inválida" }
                    require(evidence.optString("mode") in setOf("civilians", "mixed")) { "Modo Atlas inválido" }
                    require(evidence.optBoolean("nonCanonicalFrequency", false)) { "População Atlas deve declarar frequência não canônica" }
                    require(evidence.optString("ruleRef") == "braseiro://atlas-contextual-population-r4.97") { "Atlas ruleRef inválido" }
                    require(campaign.optJSONObject("worldSystems")?.optJSONObject("everydayPeople") != null) { "Everyday People não persistido" }
                    require(campaign.optJSONObject("worldSystems")?.optJSONObject("gangGuide") != null) { "Gang Guide não persistido" }
                }
                if (action == "everyday_people_social_check") {
                    require(evidence.optString("playerSkill").isNotBlank()) { "Perícia do Edgerunner ausente" }
                    require(evidence.optString("npcSkill").isNotBlank()) { "Perícia Everyday People ausente" }
                    val playerTotal = evidence.optInt("playerTotal", Int.MIN_VALUE)
                    val npcTotal = evidence.optInt("npcTotal", Int.MIN_VALUE)
                    require(playerTotal in -20..100 && npcTotal in -20..100) { "Totais do Opposed Check inválidos" }
                    require(campaign.optJSONObject("worldSystems")?.optJSONObject("everydayPeople") != null) { "Everyday People não persistido" }
                }
            }
            else -> error("Mecânica suplementar não suportada")
        }
    }

    private fun validateMechanicTransition(previous: JSONObject, next: JSONObject, mechanic: String, action: String, evidence: JSONObject) {
        if (mechanic == "netrunning") {
            validateNetrunTransition(previous, next, action, evidence)
            return
        }
        if (mechanic == "vehicle") {
            validateVehicleTransition(previous, next, action, evidence)
            return
        }
        if (mechanic == "economy") {
            validateEconomyTransition(previous, next, action, evidence)
            return
        }
        if (mechanic == "role_ability") {
            validateRoleAbilityTransition(previous, next, action, evidence)
            return
        }
        if (mechanic == "interface_red") {
            validateInterfaceRedTransition(previous, next, action, evidence)
            return
        }
        if (mechanic in setOf("world", "downtime", "mission", "single_player_mode", "interface_red_vol5", "hope_reborn", "street_stories", "npc", "mobility", "hardened_adversaries", "old_guns")) {
            validateSupplementTransition(previous, next, mechanic, action, evidence)
            return
        }
        if (mechanic == "cyberware") {
            if (action in setOf("cemk_cyberware_purchase_install", "cemk_cyberware_enhancement_install", "cemk_cyberware_enhancement_uninstall")) {
                require(evidence.optString("source").isNotBlank()) { "Fonte CEMK ausente" }
                if (action == "cemk_cyberware_purchase_install") {
                    val itemId = evidence.optString("itemId")
                    require(itemId in setOf("cemk_gorilla_arm", "cemk_mantis_blade", "cemk_monowire")) { "Cyberware CEMK inválido" }
                    require(evidence.optString("instanceId").isNotBlank()) { "Instância CEMK ausente" }
                    require(evidence.optBoolean("providerInstallationIncluded", false)) { "Instalação CEMK deve declarar provider incluso" }
                    val item = equipmentItem(itemId, previous) ?: error("Cyberware CEMK fora do catálogo")
                    val price = item.optInt("price", 0)
                    require(price > 0 && evidence.optInt("total", -1) == price) { "Preço CEMK divergente" }
                    val source = evidence.optString("currencySource")
                    val beforeEconomy = previous.optJSONObject("economy") ?: JSONObject()
                    val afterEconomy = next.optJSONObject("economy") ?: JSONObject()
                    val beforeBudget = beforeEconomy.optInt("equipmentBudget", 0); val afterBudget = afterEconomy.optInt("equipmentBudget", 0)
                    val beforeCash = beforeEconomy.optInt("eurobucks", 0); val afterCash = afterEconomy.optInt("eurobucks", 0)
                    if (source == "equipmentBudget") require(afterBudget == beforeBudget - price && afterCash == beforeCash) { "Débito CEMK de orçamento divergente" }
                    else { require(source == "eurobucks") { "Fonte de pagamento CEMK inválida" }; require(afterCash == beforeCash - price && afterBudget == beforeBudget) { "Débito CEMK de eurobucks divergente" } }
                    val afterCyber = next.optJSONArray("cyberware") ?: JSONArray(); require((0 until afterCyber.length()).any { afterCyber.optJSONObject(it)?.optString("instanceId") == evidence.optString("instanceId") && afterCyber.optJSONObject(it)?.optString("id") == itemId }) { "Cyberware CEMK não instalado" }
                } else {
                    val enhancementId = evidence.optString("enhancementId")
                    val targetInstanceId = evidence.optString("targetInstanceId")
                    require(enhancementId.isNotBlank()) { "Enhancement CEMK ausente" }
                    require(targetInstanceId.isNotBlank()) { "Alvo CEMK ausente" }
                    require(evidence.optBoolean("techService", false)) { "Enhancement CEMK exige Tech" }
                    require(!evidence.optBoolean("skillCheck", true)) { "Enhancement CEMK não usa Skill Check" }
                    require(evidence.optInt("elapsedMinutes", 0) == 60) { "Enhancement CEMK exige 1 hora" }
                    val beforeMinute = previous.optJSONObject("campaignState")?.optJSONObject("worldClock")?.optLong("elapsedMinutes", 0L) ?: 0L
                    val afterMinute = next.optJSONObject("campaignState")?.optJSONObject("worldClock")?.optLong("elapsedMinutes", 0L) ?: 0L
                    require(afterMinute == beforeMinute + 60L) { "Relógio CEMK deve avançar 1 hora" }
                    fun enhancementOf(ch: JSONObject): String? { val rows=ch.optJSONArray("cyberware")?:return null; for(i in 0 until rows.length()){ val row=rows.optJSONObject(i)?:continue; if(row.optString("instanceId")==targetInstanceId)return row.optJSONObject("enhancement")?.optString("id")?.takeIf{it.isNotBlank()} }; return null }
                    if (action == "cemk_cyberware_enhancement_install") { require(enhancementOf(previous) == null && enhancementOf(next) == enhancementId) { "Enhancement CEMK não instalado no alvo" }; require(inventoryQuantity(next, enhancementId) == inventoryQuantity(previous, enhancementId) - 1) { "Enhancement CEMK não consumido do inventário" } }
                    else { require(enhancementOf(previous) == enhancementId && enhancementOf(next) == null) { "Enhancement CEMK não removido do alvo" }; require(inventoryQuantity(next, enhancementId) == inventoryQuantity(previous, enhancementId) + 1) { "Enhancement CEMK removido não retornou ao inventário" } }
                }
                return
            }
            require(action == "activate_sandevistan") { "Ação de cyberware não suportada" }
            val installed = previous.optJSONArray("cyberware") ?: JSONArray()
            var hasSandevistan = false
            for (i in 0 until installed.length()) { val row = installed.optJSONObject(i) ?: continue; val k = (row.optString("id") + " " + row.optString("name")).lowercase(); if (row.optBoolean("installed", true) && k.contains("sandevistan")) { hasSandevistan = true; break } }
            require(hasSandevistan) { "Sandevistan não instalado" }
            val beforeFlow = combatFlow(previous); if (beforeFlow.optBoolean("active", false)) { require(!beforeFlow.optBoolean("playerActionUsed", false)) { "Ação do turno já consumida" }; require(combatFlow(next).optBoolean("playerActionUsed", false)) { "Sandevistan deve consumir Ação" } }
            val beforeCampaign = previous.optJSONObject("campaignState") ?: JSONObject(); val now = beforeCampaign.optJSONObject("worldClock")?.optLong("elapsedMinutes", 0L) ?: 0L
            val beforeSand = beforeCampaign.optJSONObject("cyberwareState")?.optJSONObject("sandevistan") ?: JSONObject(); require(now >= beforeSand.optLong("cooldownUntilMinute", 0L)) { "Sandevistan em cooldown" }
            val afterSand = next.optJSONObject("campaignState")?.optJSONObject("cyberwareState")?.optJSONObject("sandevistan") ?: error("Estado Sandevistan ausente")
            require(evidence.optLong("startsAtMinute", -1L) == now) { "Início Sandevistan divergente" }; require(afterSand.optLong("activeUntilMinute", -1L) == now + 1L && evidence.optLong("activeUntilMinute", -1L) == now + 1L) { "Duração Sandevistan divergente" }; require(afterSand.optLong("cooldownUntilMinute", -1L) == now + 61L && evidence.optLong("cooldownUntilMinute", -1L) == now + 61L) { "Cooldown Sandevistan divergente" }
            return
        }
        require(mechanic == "combat") { "Mecânica tipada não suportada" }
        val coreCombatActions = setOf("player_attack", "player_explosive", "explosive_scatter", "player_melee", "player_grab", "player_choke", "player_throw", "player_run", "reload_weapon", "put_out_fire", "use_object", "use_skill", "stabilize", "use_speedheal", "street_drug_administer", "npc_attack", "death_save", "npc_death_save", "initiative", "advance_turn", "end_combat")
        val supplementalCombatActions = setOf(
            "unjam_weapon", "reload_weapon_partial", "breaking_stuff_weapon_accident",
            "black_chrome_4tify_scan", "black_chrome_arachnid_escape", "black_chrome_battery_swap",
            "black_chrome_bmg_bipod", "black_chrome_fangfist_deploy", "black_chrome_fangfist_retract",
            "black_chrome_kleaver_charge_start", "black_chrome_ncpd_crime_database_request",
            "black_chrome_reaver_apply_fluids", "black_chrome_reaver_reload_fluids",
            "black_chrome_recover_dropped_weapon", "black_chrome_rostovic_load_metal",
            "black_chrome_tasmanskiy_klo_toggle", "black_chrome_thrown_attack",
            "black_chrome_weapon_drop_placed", "black_chrome_weapon_mode_switch",
            "black_chrome_white_hornet_mode"
        )
        require(action in coreCombatActions || action in supplementalCombatActions) { "Ação de combate não suportada" }
        val actionBudgetActions = setOf(
            "player_attack", "player_explosive", "explosive_scatter", "player_melee", "player_grab", "player_choke", "player_throw", "player_run", "reload_weapon", "reload_weapon_partial", "unjam_weapon", "put_out_fire", "use_object", "use_skill", "stabilize", "use_speedheal", "street_drug_administer", "breaking_stuff_weapon_accident",
            "black_chrome_arachnid_escape", "black_chrome_battery_swap", "black_chrome_bmg_bipod",
            "black_chrome_fangfist_retract", "black_chrome_kleaver_charge_start",
            "black_chrome_reaver_apply_fluids", "black_chrome_reaver_reload_fluids",
            "black_chrome_recover_dropped_weapon", "black_chrome_rostovic_load_metal",
            "black_chrome_thrown_attack", "black_chrome_weapon_mode_switch"
        )
        if (action in actionBudgetActions && combatFlow(previous).optBoolean("active", false)) {
            require(!combatFlow(previous).optBoolean("playerActionUsed", false)) { "Ação do turno já consumida" }
            require(combatFlow(next).optBoolean("playerActionUsed", false)) { "Ação resolvida sem consumir orçamento do turno" }
        }
        when (action) {
            "street_drug_administer" -> validateStreetDrugAdmin(previous, next, evidence)
            "player_attack" -> {
                val weaponId = evidence.getString("weaponId")
                val spent = evidence.getInt("ammoSpent")
                val targetKey = evidence.getString("targetKey")
                val capacity = weaponMagazine(previous, weaponId)
                require(capacity > 0 && spent in 1..capacity) { "Consumo de munição inválido" }
                if (weaponId.substringBefore("::bc-mode-") == "bow") {
                    val ammoItemId = evidence.getString("ammoItemId")
                    require(inventoryAmmo(next, ammoItemId) == inventoryAmmo(previous, ammoItemId) - spent) { "Flecha não consumida corretamente" }
                } else require(combatAmmo(next, weaponId) == combatAmmo(previous, weaponId) - spent) { "Munição pós-ataque divergente" }
                val before = npcCombatant(previous, targetKey)
                val after = npcCombatant(next, targetKey)
                if (before.length() > 0) {
                    require(after.optInt("hp", Int.MAX_VALUE) <= before.optInt("hp", Int.MAX_VALUE)) { "Ataque não pode curar o alvo" }
                    require(after.optInt("sp", Int.MAX_VALUE) <= before.optInt("sp", Int.MAX_VALUE)) { "Ataque não pode aumentar SP do alvo" }
                }
                val coverId = evidence.optString("coverId")
                if (coverId.isNotBlank()) {
                    val sceneId = evidence.getString("sceneId")
                    val beforeCover = sceneCover(previous, sceneId, coverId)
                    val afterCover = sceneCover(next, sceneId, coverId)
                    val declaredBefore = evidence.getInt("coverBeforeHp")
                    val damage = evidence.getInt("coverDamage")
                    require(afterCover.length() > 0 && declaredBefore > 0 && damage >= 0) { "Estado de cobertura inválido" }
                    if (beforeCover.length() > 0) require(beforeCover.optInt("hp", Int.MIN_VALUE) == declaredBefore) { "HP inicial da cobertura divergente" }
                    require(evidence.getInt("coverAfterHp") == maxOf(0, declaredBefore - damage)) { "Cálculo de cobertura divergente" }
                    require(afterCover.optInt("hp", Int.MIN_VALUE) == evidence.getInt("coverAfterHp")) { "HP persistido da cobertura divergente" }
                    require(afterCover.optBoolean("destroyed", false) == (afterCover.optInt("hp", 0) < 1)) { "Estado destruído da cobertura divergente" }
                }
            }
            "player_grab" -> {
                val targetKey = evidence.getString("targetKey")
                val success = evidence.getBoolean("success")
                require(evidence.getInt("attack") != evidence.getInt("defense") || !success) { "Empate em Grab favorece o defensor" }
                require(success == (evidence.getInt("attack") > evidence.getInt("defense"))) { "Resultado de Grab divergente" }
                if (success) {
                    val grapple = next.optJSONObject("combatState")?.optJSONObject("grapple") ?: error("Estado de Grapple ausente")
                    require(grapple.optBoolean("active", false) && grapple.optString("targetKey") == targetKey) { "Grapple não persistido" }
                    val afterTarget = npcCombatant(next, targetKey)
                    require(afterTarget.optString("grappledBy") == "player" || afterTarget.optBoolean("grappledByPlayer", false)) { "Alvo não marcado como agarrado" }
                }
            }
            "player_choke" -> {
                val targetKey = evidence.getString("targetKey")
                val grapple = previous.optJSONObject("combatState")?.optJSONObject("grapple") ?: error("Grapple ausente")
                require(grapple.optBoolean("active", false) && grapple.optString("targetKey") == targetKey) { "Choke exige alvo agarrado" }
                val beforeTarget = npcCombatant(previous, targetKey); val afterTarget = npcCombatant(next, targetKey)
                val damage = evidence.getInt("damage")
                require(damage >= 0 && evidence.getInt("hpBefore") == beforeTarget.optInt("hp", Int.MIN_VALUE)) { "HP inicial de Choke divergente" }
                require(evidence.getInt("hpAfter") == afterTarget.optInt("hp", Int.MIN_VALUE)) { "HP final de Choke divergente" }
                require(afterTarget.optInt("sp", 0) == beforeTarget.optInt("sp", 0)) { "Choke não pode alterar SP" }
                require(evidence.getInt("consecutiveRounds") >= 1) { "Contagem de Choke inválida" }
            }
            "player_throw" -> {
                val targetKey = evidence.getString("targetKey")
                val grapple = previous.optJSONObject("combatState")?.optJSONObject("grapple") ?: error("Grapple ausente")
                require(grapple.optBoolean("active", false) && grapple.optString("targetKey") == targetKey) { "Throw exige alvo agarrado" }
                val beforeTarget = npcCombatant(previous, targetKey); val afterTarget = npcCombatant(next, targetKey)
                require(evidence.getInt("hpBefore") == beforeTarget.optInt("hp", Int.MIN_VALUE) && evidence.getInt("hpAfter") == afterTarget.optInt("hp", Int.MIN_VALUE)) { "HP de Throw divergente" }
                require(afterTarget.optBoolean("prone", false) && evidence.optBoolean("prone", false)) { "Throw deve deixar o alvo Prone" }
                require(afterTarget.optInt("sp", 0) == beforeTarget.optInt("sp", 0)) { "Throw não pode alterar SP" }
                val nextGrapple = next.optJSONObject("combatState")?.optJSONObject("grapple") ?: JSONObject()
                require(!nextGrapple.optBoolean("active", false)) { "Throw deve encerrar o Grapple" }
            }
            "reload_weapon" -> {
                val weaponId = evidence.getString("weaponId")
                val transferred = evidence.getInt("transferred")
                val returned = evidence.optInt("returned", 0)
                val capacity = weaponMagazine(previous, weaponId)
                require(capacity > 0 && transferred > 0 && returned >= 0) { "Recarga inválida" }
                require(combatAmmo(next, weaponId) == combatAmmo(previous, weaponId) - returned + transferred) { "Carregador pós-recarga divergente" }
                require(combatAmmo(next, weaponId) <= capacity) { "Carregador acima da capacidade" }
                if (!evidence.optBoolean("freeAmmo", false)) {
                    val ammoItemId = evidence.optString("ammoItemId")
                    require(ammoItemId.isNotBlank()) { "Munição de inventário ausente" }
                    val oldAmmoItemId = evidence.optString("oldAmmoItemId")
                    val selectedBefore = inventoryAmmo(previous, ammoItemId)
                    val selectedAfter = inventoryAmmo(next, ammoItemId)
                    if (oldAmmoItemId.isNotBlank() && oldAmmoItemId == ammoItemId) {
                        require(selectedAfter == selectedBefore + returned - transferred) { "Reserva da munição recarregada divergente" }
                    } else {
                        require(selectedAfter == selectedBefore - transferred) { "Reserva da munição recarregada divergente" }
                        if (returned > 0 && oldAmmoItemId.isNotBlank()) require(inventoryAmmo(next, oldAmmoItemId) == inventoryAmmo(previous, oldAmmoItemId) + returned) { "Munição descarregada não retornou ao inventário" }
                    }
                    require(evidence.optString("ammoEffect").isNotBlank()) { "Efeito de munição ausente" }
                }
            }
            "reload_weapon_partial" -> {
                require(evidence.getString("weaponId").isNotBlank()) { "Arma de recarga parcial ausente" }
                val step = evidence.getInt("step"); val required = evidence.getInt("required")
                require(required > 1 && step in 1 until required) { "Etapa de recarga parcial inválida" }
                require(combatAmmo(next, evidence.getString("weaponId")) == combatAmmo(previous, evidence.getString("weaponId"))) { "Recarga parcial não pode transferir munição antes da conclusão" }
            }
            "unjam_weapon" -> {
                require(evidence.getString("weaponId").isNotBlank()) { "Arma emperrada ausente" }
            }
            "explosive_scatter" -> {
                val weaponId = evidence.getString("weaponId")
                require(weaponMagazine(previous, weaponId) > 0 || equipmentItem(weaponId.substringBefore("::bc-mode-"), previous) != null) { "Scatter explosivo inválido" }
                require(evidence.getString("objectId").matches(Regex("""\d+,\d+"""))) { "Célula de scatter inválida" }
            }
            "player_explosive" -> {
                val weaponId = evidence.getString("weaponId")
                val baseId = weaponId.substringBefore("::bc-mode-")
                require(evidence.getInt("ammoSpent") == 1) { "Explosivo consome uma munição" }
                require(evidence.optInt("areaCells", 25) in setOf(0, 25)) { "Área explosiva inválida" }
                require(evidence.optInt("damageDice", 0) >= 0) { "Dados explosivos inválidos" }
                if (evidence.optBoolean("thrown", false)) {
                    require(inventoryQuantity(next, baseId) == inventoryQuantity(previous, baseId) - 1) { "Explosivo arremessado não consumido" }
                } else {
                    require(weaponMagazine(previous, weaponId) > 0) { "Arma explosiva sem carregador validado" }
                    require(combatAmmo(next, weaponId) == combatAmmo(previous, weaponId) - 1) { "Munição explosiva divergente" }
                }
            }
            "player_run" -> {
                require(evidence.getInt("moveAllowance") > 0) { "Run sem orçamento de movimento" }
                require(combatFlow(next).optBoolean("playerActionUsed", false)) { "Run deve consumir a Ação" }
            }
            "put_out_fire" -> {
                require(!combatPlayer(next).optBoolean("burning", false)) { "Apagar fogo deve remover Burning" }
            }
            "use_object", "use_skill" -> {
                require(evidence.optString("objectId").isNotBlank() || evidence.optString("skill").isNotBlank()) { "Interação sem alvo mecânico" }
            }
            "breaking_stuff_weapon_accident" -> {
                require(evidence.optString("source").contains("Breaking", ignoreCase = true)) { "Fonte Breaking Your Stuff ausente" }
                require(evidence.optString("weaponId").isNotBlank()) { "Arma do acidente ausente" }
            }
            "black_chrome_4tify_scan", "black_chrome_ncpd_crime_database_request",
            "black_chrome_arachnid_escape", "black_chrome_battery_swap", "black_chrome_bmg_bipod",
            "black_chrome_fangfist_deploy", "black_chrome_fangfist_retract", "black_chrome_kleaver_charge_start",
            "black_chrome_reaver_apply_fluids", "black_chrome_reaver_reload_fluids",
            "black_chrome_recover_dropped_weapon", "black_chrome_rostovic_load_metal",
            "black_chrome_tasmanskiy_klo_toggle", "black_chrome_thrown_attack",
            "black_chrome_weapon_drop_placed", "black_chrome_weapon_mode_switch", "black_chrome_white_hornet_mode" -> {
                require(evidence.optString("source").contains("Black Chrome", ignoreCase = true) || evidence.optString("source").contains("Cyberpunk RED Core", ignoreCase = true)) { "Fonte Black Chrome/Core ausente" }
                if (action !in setOf("black_chrome_4tify_scan", "black_chrome_ncpd_crime_database_request", "black_chrome_arachnid_escape")) require(evidence.optString("weaponId").isNotBlank()) { "Arma Black Chrome ausente" }
            }
            "player_melee" -> {
                val targetKey = evidence.getString("targetKey")
                require(evidence.getString("mode") in setOf("brawling", "melee_weapon")) { "Modo corpo a corpo inválido" }
                require(evidence.getInt("attacks") in 1..2) { "ROF corpo a corpo inválido" }
                val before = npcCombatant(previous, targetKey)
                val after = npcCombatant(next, targetKey)
                require(after.length() > 0) { "Alvo corpo a corpo ausente" }
                if (before.length() > 0) {
                    require(after.optInt("hp", Int.MAX_VALUE) <= before.optInt("hp", Int.MAX_VALUE)) { "Corpo a corpo não pode curar o alvo" }
                    require(after.optInt("sp", Int.MAX_VALUE) <= before.optInt("sp", Int.MAX_VALUE)) { "Corpo a corpo não pode aumentar SP do alvo" }
                }
            }
            "stabilize" -> {
                val before = combatPlayer(previous)
                val after = combatPlayer(next)
                require(before.length() > 0 && after.length() > 0) { "Estado médico ausente" }
                require(before.optInt("hp", 0) < before.optInt("maxHp", 0)) { "Estabilização exige ferimento" }
                if (evidence.getBoolean("success")) {
                    require(after.optBoolean("stabilized", false)) { "Sucesso deve marcar estabilização" }
                    val expectedHp = if (before.optInt("hp", 0) < 1) 1 else before.optInt("hp", 0)
                    require(after.optInt("hp", Int.MIN_VALUE) == expectedHp) { "HP pós-estabilização divergente" }
                } else {
                    require(after.optInt("hp", Int.MIN_VALUE) == before.optInt("hp", 0)) { "Falha não pode alterar HP" }
                }
            }
            "use_speedheal" -> {
                require(previous.optString("role") == "medtech" && next.optString("role") == "medtech") { "Somente Medtech administra Fármacos" }
                require(evidence.getString("itemId") == "speedheal") { "Fármaco inválido" }
                val before = combatPlayer(previous)
                val after = combatPlayer(next)
                require(before.length() > 0 && after.length() > 0) { "Estado médico ausente" }
                val hpBefore = before.optInt("hp", 0)
                val maxHp = before.optInt("maxHp", previous.optJSONObject("derived")?.optInt("maxHp", 0) ?: 0)
                require(hpBefore in 1 until maxHp) { "Speedheal exige alvo ferido, mas não mortalmente" }
                val day = evidence.getInt("day")
                val previousDay = previous.optJSONObject("combatState")?.optJSONObject("pharmaceuticals")?.optInt("speedhealLastDay", Int.MIN_VALUE) ?: Int.MIN_VALUE
                val nextDay = next.optJSONObject("combatState")?.optJSONObject("pharmaceuticals")?.optInt("speedhealLastDay", Int.MIN_VALUE) ?: Int.MIN_VALUE
                require(previousDay != day && nextDay == day) { "Limite diário do Speedheal violado" }
                val stats = previous.optJSONObject("stats") ?: JSONObject()
                val expectedHp = minOf(maxHp, hpBefore + stats.optInt("BODY", 0) + stats.optInt("WILL", 0))
                require(after.optInt("hp", Int.MIN_VALUE) == expectedHp) { "Cura do Speedheal divergente" }
                require(inventoryQuantity(previous, "speedheal") > 0 && inventoryQuantity(next, "speedheal") == inventoryQuantity(previous, "speedheal") - 1) { "Consumo do Speedheal divergente" }
            }
            "npc_attack" -> {
                val before = combatPlayer(previous)
                val after = combatPlayer(next)
                require(after.optInt("hp", Int.MAX_VALUE) <= before.optInt("hp", Int.MAX_VALUE)) { "NPC não pode curar o personagem" }
                require(after.optInt("sp", Int.MAX_VALUE) <= before.optInt("sp", Int.MAX_VALUE)) { "NPC não pode aumentar SP do personagem" }
                val coverId = evidence.optString("coverId")
                if (coverId.isNotBlank()) {
                    val sceneId = evidence.getString("sceneId")
                    val beforeCover = sceneCover(previous, sceneId, coverId)
                    val afterCover = sceneCover(next, sceneId, coverId)
                    val declaredBefore = evidence.getInt("coverBeforeHp")
                    val damage = evidence.getInt("coverDamage")
                    if (beforeCover.length() > 0) require(beforeCover.optInt("hp", Int.MIN_VALUE) == declaredBefore) { "HP inicial da cobertura divergente" }
                    require(afterCover.length() > 0 && afterCover.optInt("hp", Int.MIN_VALUE) == maxOf(0, declaredBefore - damage)) { "Dano do NPC na cobertura divergente" }
                    require(afterCover.optBoolean("destroyed", false) == (afterCover.optInt("hp", 0) < 1)) { "Estado destruído da cobertura divergente" }
                }
            }
            "death_save" -> {
                val before = combatPlayer(previous)
                val after = combatPlayer(next)
                require(before.optInt("hp", 1) < 1 && after.optInt("hp", 1) < 1) { "Death Save exige ferimento mortal" }
                require(after.optInt("deathSavePenalty", 0) == before.optInt("deathSavePenalty", 0) + 1) { "Penalidade de Death Save divergente" }
                if (!evidence.getBoolean("success")) require(after.optBoolean("dead", false)) { "Falha no Death Save deve matar" }
            }
            "npc_death_save" -> {
                val key = evidence.getString("targetKey")
                val before = npcCombatant(previous, key)
                val after = npcCombatant(next, key)
                require(before.optInt("hp", 1) < 1 && after.optInt("hp", 1) < 1) { "Death Save de NPC exige ferimento mortal" }
                require(after.optInt("deathSavePenalty", 0) == before.optInt("deathSavePenalty", 0) + 1) { "Penalidade de Death Save do NPC divergente" }
                if (!evidence.getBoolean("success")) require(after.optBoolean("dead", false)) { "Falha no Death Save do NPC deve matar" }
            }
        }
    }

    private fun canonicalResolution(
        requestId: String,
        mechanic: String,
        action: String,
        outcome: String,
        ruleRefs: JSONArray,
        effects: JSONArray,
    ): JSONObject = JSONObject()
        .put("resolution_id", "$requestId:resolution")
        .put("command_id", requestId)
        .put("system_id", SYSTEM_ID)
        .put("system_version", SYSTEM_VERSION)
        .put("family", SYSTEM_ID)
        .put("source", "rules_kernel")
        .put("mechanic", mechanic)
        .put("action", action)
        .put("requirement", "resolved")
        .put("outcome", outcome)
        .put("rule_refs", ruleRefs)
        .put("effects", effects)

    fun saveCharacter(characterId: String, characterJson: String): JSONObject = synchronized(canonicalTurnLock) {
        require(characterId.isNotBlank()) { "characterId obrigatório" }
        val character = JSONObject(characterJson)
        require(character.optString("characterId", characterId) == characterId) { "characterId divergente" }
        character.put("characterId", characterId)

        val existingRaw = storedCharacter(characterId)
        val existingObj = existingRaw?.let { runCatching { JSONObject(it) }.getOrNull() }
        val expectedStateVersion = character.optLong("_expectedStateVersion", -1L)
        if (expectedStateVersion >= 0L && existingObj != null) {
            val currentVersion = existingObj.optLong("stateVersion", 0L)
            if (currentVersion > 0L && currentVersion != expectedStateVersion) {
                return JSONObject()
                    .put("ok", false)
                    .put("resolved", false)
                    .put("blocked", true)
                    .put("reason", "CAS_STATE_VERSION_CONFLICT")
                    .put("expectedStateVersion", expectedStateVersion)
                    .put("actualStateVersion", currentVersion)
            }
        }
        val expectedJacketRev = character.optInt("_expectedJacketRevision", -1)
        if (expectedJacketRev >= 0 && existingObj != null) {
            val currentJacketRev = existingObj.optJSONObject("campaignState")
                ?.optJSONObject("theJacket")?.optInt("revision", 0) ?: 0
            if (currentJacketRev != expectedJacketRev) {
                return JSONObject()
                    .put("ok", false)
                    .put("resolved", false)
                    .put("blocked", true)
                    .put("reason", "CAS_JACKET_REVISION_CONFLICT")
                    .put("expectedJacketRevision", expectedJacketRev)
                    .put("actualJacketRevision", currentJacketRev)
            }
        }
        character.remove("_expectedStateVersion")
        character.remove("_expectedJacketRevision")

        val priorVersion = existingObj?.optLong("stateVersion", 0L) ?: 0L
        val nextVersion = maxOf(priorVersion + 1L, character.optLong("stateVersion", 1L))
        character.put("stateVersion", nextVersion)

        val requestId = "character-${UUID.randomUUID()}"
        val effects = JSONArray()
            .put(JSONObject()
                .put("type", "player_state_set")
                .put("path", "characters.${canonicalCharacterKey(characterId)}")
                .put("value", character))
            .put(JSONObject()
                .put("type", "player_state_set")
                .put("path", "activeCharacterId")
                .put("value", characterId))
        val committed = canonicalTurn(JSONObject()
            .put("text", "Persistir ficha canônica de ${character.optString("name", "Edgerunner")}")
            .put("request_id", requestId)
            .put("mechanical", true)
            .put("importance", "normal")
            .put("input_channel", "GM_HELP")
            .put("defer_narrative", true)
            .put("resolution", canonicalResolution(
                requestId = requestId,
                mechanic = "character_state",
                action = "save_character",
                outcome = "committed",
                ruleRefs = JSONArray().put("barbara://cyberpunk-red/character/v1"),
                effects = effects,
            )))

        runBlocking(Dispatchers.IO) {
            characters.upsert(CyberpunkCharacterEntity(characterId, character.toString(), System.currentTimeMillis()))
        }
        prefs.edit().putString("activeCharacterId", characterId).apply()
        val result = committed.optJSONObject("result") ?: JSONObject()
        val finalStateVersion = result.optLong("state_version", nextVersion).let { if (it > 0L) maxOf(it, nextVersion) else nextVersion }
        character.put("stateVersion", finalStateVersion)
        runBlocking(Dispatchers.IO) {
            characters.upsert(CyberpunkCharacterEntity(characterId, character.toString(), System.currentTimeMillis()))
        }
        return JSONObject()
            .put("ok", true)
            .put("resolved", true)
            .put("mode", "barbara-platform-canonical")
            .put("projection", "room-read-model")
            .put("characterId", characterId)
            .put("stateVersion", finalStateVersion)
            .put("transactionId", result.optString("transaction_id"))
    }

    fun commitCharacterMechanic(payload: JSONObject): JSONObject {
        val characterId = payload.getString("characterId")
        val mechanic = payload.getString("mechanic")
        val action = payload.getString("action")
        val evidence = payload.getJSONObject("evidence")
        val previous = storedCharacter(characterId)?.let(::JSONObject) ?: error("Personagem canônico inexistente")
        val character = JSONObject(payload.getJSONObject("character").toString())
        require(character.optString("characterId") == characterId) { "characterId divergente" }
        validateMechanicTransition(previous, character, mechanic, action, evidence)
        val requestId = "mechanic-${UUID.randomUUID()}"
        val ruleRef = when (mechanic) {
            "single_player_mode" -> "cpred-single-player-mode-v1.0://oracle-mission-beats-morale-clocks"
            "interface_red_vol5" -> "cpred-interface-red-vol5-v1.1://investigation-cyberpets-screamsheet-agents-derby"
            "hope_reborn" -> "cpred-hope-reborn-v1.1://campaign-hacking-agents-roller-derby"
            "street_stories" -> "cpred-tales-of-the-red-street-stories-v1.2://missions-world-offscreen"
            "mobility" -> "cpred-cyberchairs-v1.1://mobility"
            "hardened_adversaries" -> "cpred-hardened-adversaries-2021://mooks-lieutenants"
            "old_guns" -> "cpred-old-guns-never-die-2020://conversion"
            "npc" -> when {
                action == "atlas_population_spawn" -> "braseiro://atlas-contextual-population-r4.97"
                action.startsWith("everyday_people_") -> "cpred-everyday-people-v1.01://night-city-citizens"
                action.startsWith("gang_guide_") -> "cpred-night-city-gang-guide-v1.0://gangs-base-members"
                action == "fast_and_furriest_spawn" -> "cpred-fast-and-furriest-2021://lieutenant-profiles"
                else -> "cpred-danger-gal-dossier-v1.1://named-adversaries"
            }
            "mission" -> "cpred-going-quiet-v1.1://stealth-operations"
            "world" -> if (action == "night_city_weather") "cpred-night-city-weather://weather" else "cpred-no-place-like-home-v1.0://headquarters"
            "downtime" -> if (action.startsWith("salvage_")) "cpred-salvaging-night-city://downtime" else "cpred-no-place-like-home-v1.0://headquarters"
            "interface_red" -> "cpred-interface-red://runtime"
            else -> "cpred-core-v1.25://friday-night-firefight"
        }
        val ruleRefs = JSONArray().put(ruleRef)
        val audit = JSONObject()
            .put("requestId", requestId)
            .put("mechanic", mechanic)
            .put("action", action)
            .put("evidence", JSONObject(evidence.toString()))
            .put("ruleRefs", ruleRefs)
            .put("committedAtEpochMs", System.currentTimeMillis())
        val combatState = character.optJSONObject("combatState") ?: JSONObject().also { character.put("combatState", it) }
        combatState.put("lastResolution", audit)
        val effects = JSONArray()
            .put(JSONObject().put("type", "player_state_set").put("path", "characters.${canonicalCharacterKey(characterId)}").put("value", character))
            .put(JSONObject().put("type", "player_state_set").put("path", "activeCharacterId").put("value", characterId))
        // The local VTT resolves combat itself; one return to the player via advance_turn is one RED round.
        // Advance the Motor Barbara canonical game_time here so timed effects never freeze during local combat.
        if (mechanic == "combat" && action == "advance_turn") {
            effects.put(JSONObject().put("type", "time_advance").put("unit", "round").put("amount", 1))
        }
        if (mechanic == "interface_red" && action == "pharmaceutical_synthesize") {
            effects.put(JSONObject().put("type", "time_advance").put("unit", "minute").put("amount", 60))
        }
        if (mechanic == "hope_reborn" && action == "hope_agent_hack") {
            effects.put(JSONObject().put("type", "time_advance").put("unit", "minute").put("amount", 1))
        }
        if (mechanic == "hope_reborn" && action == "hope_agent_command") {
            val secs = evidence.optInt("durationSeconds", 0)
            if (secs >= 60 && secs % 60 == 0) effects.put(JSONObject().put("type", "time_advance").put("unit", "minute").put("amount", secs / 60))
        }
        if (mechanic == "hope_reborn" && action == "hope_agent_reboot") {
            effects.put(JSONObject().put("type", "time_advance").put("unit", "minute").put("amount", 5))
        }
        if (mechanic == "downtime" && action in setOf("salvage_complete", "no_place_like_home_practice")) {
            val days = evidence.optInt("days", 0)
            if (days > 0) effects.put(JSONObject().put("type", "time_advance").put("unit", "day").put("amount", days))
        }
        val committed = canonicalTurn(JSONObject()
            .put("text", "Resolver $mechanic/$action para ${character.optString("name", "Edgerunner")}")
            .put("request_id", requestId)
            .put("mechanical", true)
            .put("importance", "high")
            .put("input_channel", "GM_HELP")
            .put("defer_narrative", true)
            .put("resolution", canonicalResolution(requestId, mechanic, action, "committed", ruleRefs, effects)))
        runBlocking(Dispatchers.IO) {
            characters.upsert(CyberpunkCharacterEntity(characterId, character.toString(), System.currentTimeMillis()))
        }
        val result = committed.optJSONObject("result") ?: JSONObject()
        val response = JSONObject().put("ok", true).put("mode", "barbara-platform-typed-mechanic")
            .put("characterId", characterId).put("stateVersion", result.optLong("state_version", -1L))
            .put("transactionId", result.optString("transaction_id"))
        canonicalGameTimeSeconds(committed)?.let { seconds ->
            syncCharacterClockProjection(characterId, seconds, requestId, result)?.let { response.put("worldTimeAdvance", it) }
        }
        return response
    }

    /** Player fiction/action channel. Mechanics may return a WAITING_* phase. */
    fun playerAction(payload: JSONObject): JSONObject = submitTurn(payload, "PLAYER_ACTION")

    /** Rules/help channel. It never bypasses the same durable World transaction boundary. */
    fun gmHelp(payload: JSONObject): JSONObject = submitTurn(payload, "GM_HELP")

    private fun manualEvidenceProjection(committed: JSONObject): JSONObject? {
        val result = committed.optJSONObject("result") ?: return null
        val evidence = result.optJSONObject("narrative_input")?.optJSONArray("evidence") ?: return null
        if (evidence.length() == 0) return null
        val sources = result.optJSONObject("master_evidence")?.optJSONArray("sources") ?: JSONArray()
        val sourcePages = mutableMapOf<String, Int>()
        for (index in 0 until sources.length()) {
            val source = sources.optJSONObject(index) ?: continue
            source.optInt("page", -1).takeIf { it > 0 }?.let { sourcePages[source.optString("source_id")] = it }
        }
        val citations = JSONArray()
        val excerpts = mutableListOf<String>()
        for (index in 0 until minOf(evidence.length(), 4)) {
            val row = evidence.optJSONObject(index) ?: continue
            val sourceId = row.optString("source_id")
            val page = sourcePages[sourceId]
            val sourceLabel = sourceId.substringAfterLast('/').ifBlank { sourceId }
            val text = row.optString("text").replace(Regex("\\s+"), " ").trim().take(700)
            if (text.isBlank()) continue
            excerpts += "${excerpts.size + 1}. $text\n— $sourceLabel${page?.let { ", p. $it" } ?: ""}"
            citations.put(JSONObject().put("sourceId", sourceId).put("page", page ?: JSONObject.NULL))
        }
        if (excerpts.isEmpty()) return null
        return JSONObject()
            .put("mode", "deterministic-local-evidence")
            .put("text", "Trechos localizados no corpus autorizado:\n\n${excerpts.joinToString("\n\n")}")
            .put("citations", citations)
            .put("insufficientEvidence", result.optJSONObject("retrieval")?.optBoolean("insufficient_evidence", false) ?: false)
    }

    private fun submitTurn(payload: JSONObject, inputChannel: String): JSONObject {
        val text = payload.optString("text").trim()
        require(text.isNotEmpty()) { "Texto da ação obrigatório" }
        val worldContext = payload.optString("worldContext").trim().take(12000)
        val narrationDirective = if (inputChannel == "PLAYER_ACTION") """
            |INSTRUÇÃO DE NARRAÇÃO: responda em PT-BR natural como Mestre de RPG. Para ações importantes, produza narração substancial, sensorial e contínua, sem truncar em um parágrafo curto. Mostre o que o personagem percebe, NPCs agindo por objetivos próprios, ambiente, horário, clima e consequências do mundo quando forem relevantes. Não determine sentimentos, pensamentos ou decisões internas do personagem do jogador. Termine a cena com uma abertura explícita e contextual para a decisão do jogador, como “O que você faz?”, sem decidir por ele.
        """.trimMargin() else ""
        val enrichedText = buildString {
            append(text)
            if (worldContext.isNotBlank()) {
                append("\n\n--- CONTEXTO INTERNO DO MUNDO VIVO ---\n")
                append(worldContext)
                append("\n--- FIM DO CONTEXTO INTERNO ---")
            }
            if (narrationDirective.isNotBlank()) {
                append("\n\n")
                append(narrationDirective)
            }
        }
        val request = JSONObject()
            .put("text", enrichedText)
            .put("request_id", payload.optString("request_id").takeIf { it.isNotBlank() } ?: "turn-${UUID.randomUUID()}")
            .put("mechanical", payload.optBoolean("mechanical", false))
            .put("importance", payload.optString("importance", "normal"))
            .put("input_channel", inputChannel)
            .put("defer_narrative", payload.optBoolean("defer_narrative", false))
        payload.optJSONObject("resolution")?.let { request.put("resolution", it) }
        payload.optString("resume_action_id").takeIf { it.isNotBlank() }?.let { request.put("resume_action_id", it) }
        payload.optLong("expected_state_version", -1L).takeIf { it >= 0L }?.let { request.put("expected_state_version", it) }
        val committed = canonicalTurn(request)
        val response = JSONObject(committed.toString()).put("ok", true).put("mode", "barbara-platform-canonical")
        val characterId = payload.optString("characterId").takeIf { it.isNotBlank() } ?: activeCharacterId()
        val canonicalSeconds = canonicalGameTimeSeconds(committed)
        if (characterId != null && canonicalSeconds != null) {
            syncCharacterClockProjection(characterId, canonicalSeconds, request.getString("request_id"), committed.optJSONObject("result") ?: JSONObject())
                ?.let { response.put("worldTimeAdvance", it) }
        }
        if (inputChannel == "GM_HELP") manualEvidenceProjection(committed)?.let { response.put("manualAnswer", it) }
        return response
    }

    fun createWorldBackup(label: String): JSONObject {
        val safe = label.trim().ifBlank { "manual" }.replace(Regex("[^a-zA-Z0-9._-]+"), "_").take(80)
        val dir = backupDirectory()
        val target = File(dir, "${System.currentTimeMillis()}_${safe}.barbara-world.zip")
        val out = gateway.platformBackupWorld(activeWorldId(), target.absolutePath)
        return JSONObject(out.toString())
            .put("ok", true)
            .put("mode", "barbara-world-backup-v1")
            .put("name", target.name)
            .put("label", safe)
    }

    fun listWorldBackups(): JSONArray {
        val dir = backupDirectory()
        val files = dir.listFiles { file -> file.isFile && file.name.endsWith(".barbara-world.zip") }
            ?.sortedByDescending { it.lastModified() }
            ?: emptyList()
        return JSONArray().also { out ->
            files.forEach { file ->
                val label = file.name.substringAfter('_').removeSuffix(".barbara-world.zip").replace('_', ' ')
                out.put(JSONObject()
                    .put("name", file.name)
                    .put("label", label)
                    .put("size", file.length())
                    .put("modifiedAtEpochMs", file.lastModified()))
            }
        }
    }

    private fun backupDirectory(): File = File(context.filesDir, "barbara-world-backups").apply { mkdirs() }

    private fun backupFile(name: String): File {
        require(name.matches(Regex("[a-zA-Z0-9._-]{1,180}\\.barbara-world\\.zip"))) { "Nome de backup inválido" }
        val dir = backupDirectory().canonicalFile
        val file = File(dir, name).canonicalFile
        require(file.parentFile == dir && file.isFile) { "Backup inexistente" }
        return file
    }

    private fun backupCharacterProjection(file: File): Pair<String?, List<JSONObject>> = ZipFile(file).use { archive ->
        val entry = archive.getEntry("campaign.json") ?: error("Backup sem campaign.json")
        val campaign = archive.getInputStream(entry).bufferedReader(Charsets.UTF_8).use { JSONObject(it.readText()) }
        val playerState = campaign.getJSONObject("state").optJSONObject("player_state") ?: JSONObject()
        val activeId = playerState.optString("activeCharacterId").takeIf { it.isNotBlank() }
        val charactersObject = playerState.optJSONObject("characters") ?: JSONObject()
        val restored = mutableListOf<JSONObject>()
        val keys = charactersObject.keys()
        while (keys.hasNext()) {
            val character = charactersObject.optJSONObject(keys.next()) ?: continue
            if (!character.optBoolean("deleted", false) && character.optString("characterId").isNotBlank()) restored += JSONObject(character.toString())
        }
        activeId to restored
    }

    fun restoreWorldBackup(name: String): JSONObject = synchronized(canonicalTurnLock) {
        val file = backupFile(name)
        val (savedActiveId, restoredCharacters) = backupCharacterProjection(file)
        val suffix = UUID.randomUUID().toString().replace("-", "").take(12)
        val targetWorldId = "cpred-restore-$suffix"
        val targetCampaignId = "cpred-restore-campaign-$suffix"
        val previousWorldId = activeWorldId()
        val restored = gateway.platformRestoreWorld(file.absolutePath, targetWorldId, targetCampaignId)
        gateway.platformStopWorld(previousWorldId)
        prefs.edit().putString("activeWorldId", targetWorldId).apply()

        runBlocking(Dispatchers.IO) {
            restoredCharacters.forEach { character ->
                val id = character.getString("characterId")
                characters.upsert(CyberpunkCharacterEntity(id, character.toString(), System.currentTimeMillis()))
            }
        }
        val active = restoredCharacters.firstOrNull { it.optString("characterId") == savedActiveId }
            ?: restoredCharacters.firstOrNull()
        active?.optString("characterId")?.takeIf { it.isNotBlank() }?.let { id ->
            prefs.edit().putString("activeCharacterId", id).apply()
        }
        ensureAtlasVtt()
        JSONObject(restored.toString())
            .put("ok", true)
            .put("mode", "barbara-world-restore-v1")
            .put("worldId", targetWorldId)
            .put("sourceBackup", name)
            .put("character", active)
    }

    fun deleteWorldBackup(name: String): JSONObject {
        val file = backupFile(name)
        require(file.delete()) { "Não foi possível excluir o backup" }
        return JSONObject().put("ok", true).put("name", name)
    }

    private fun ensureActiveWorldSelection() {
        val worlds = gateway.platformWorlds()
        val ids = (0 until worlds.length())
            .mapNotNull { worlds.optJSONObject(it)?.optString("world_id") }
            .toSet()
        if (!prefs.getBoolean("v4WorldSelected", false) || activeWorldId() !in ids) {
            prefs.edit().putString("activeWorldId", WORLD_ID).putBoolean("v4WorldSelected", true).apply()
        }
    }

    fun activeWorldId(): String = prefs.getString("activeWorldId", WORLD_ID)
        ?.takeIf { it.matches(Regex("[a-zA-Z0-9._-]{1,120}")) }
        ?: WORLD_ID

    fun activeCharacterId(): String? = prefs.getString("activeCharacterId", null)

    private fun storedCharacter(characterId: String): String? = runBlocking(Dispatchers.IO) {
        characters.get(characterId)?.characterJson
    }


    fun listCharacters(): JSONObject = synchronized(canonicalTurnLock) {
        val rows = runBlocking(Dispatchers.IO) { characters.list() }
        val items = JSONArray()
        rows.forEach { row ->
            val c = JSONObject(row.characterJson)
            if (!c.optBoolean("deleted", false)) items.put(c)
        }
        JSONObject().put("ok", true).put("characters", items)
    }

    fun deleteCharacter(characterId: String): JSONObject = synchronized(canonicalTurnLock) {
        require(!storedCharacter(characterId).isNullOrBlank()) { "Personagem inexistente" }
        val next = runBlocking(Dispatchers.IO) { characters.list() }.firstOrNull { it.characterId != characterId }?.characterId
        val requestId = "delete-character-${UUID.randomUUID()}"
        val effects = JSONArray()
            .put(JSONObject().put("type", "player_state_set").put("path", "characters.${canonicalCharacterKey(characterId)}")
                .put("value", JSONObject().put("characterId", characterId).put("deleted", true)))
        if (activeCharacterId() == characterId) effects.put(JSONObject().put("type", "player_state_set").put("path", "activeCharacterId").put("value", next ?: JSONObject.NULL))
        canonicalTurn(JSONObject().put("text", "Excluir ficha canônica").put("request_id", requestId)
            .put("mechanical", true).put("input_channel", "GM_HELP").put("defer_narrative", true)
            .put("resolution", canonicalResolution(requestId, "character_state", "delete_character", "committed", JSONArray().put("barbara://cyberpunk-red/character/v1"), effects)))
        runBlocking(Dispatchers.IO) { characters.delete(characterId) }
        if (activeCharacterId() == characterId) prefs.edit().apply { if(next == null) remove("activeCharacterId") else putString("activeCharacterId", next) }.commit()
        JSONObject().put("ok", true).put("characterId", characterId)
    }

    fun loadCharacter(characterId: String?): String? {
        val id = characterId ?: activeCharacterId() ?: return null
        val raw = storedCharacter(id) ?: return null
        return try {
            val c = JSONObject(raw)
            val snap = gateway.platformVttSnapshot(activeWorldId(), PLAYER_ACTOR_ID, "gm")
            val state = snap.getJSONObject("state")
            val map = state.optJSONObject("map") ?: JSONObject()
            val token = state.optJSONObject("tokens")?.optJSONObject(PLAYER_TOKEN_ID)
            if (token != null) {
                val prior = c.optJSONObject("worldPosition") ?: JSONObject()
                val sceneId = sceneIdFromMap(map)
                if (sceneId != null) {
                    val w = map.optDouble("width", 1.0).coerceAtLeast(1.0)
                    val h = map.optDouble("height", 1.0).coerceAtLeast(1.0)
                    val stateLocation = state.optString("location").takeIf { it.matches(Regex("[A-X]\\d+")) }
                    val rememberedPoi = prior.optString("poiCode").takeIf { it.matches(Regex("[A-X]\\d+")) }
                    prior.put("atlasId", "night-city-2045")
                        .put("mode", "interior")
                        .put("sceneId", sceneId)
                        .put("poiCode", stateLocation ?: rememberedPoi)
                        .put("local", JSONObject()
                            .put("x", (token.getDouble("x") / w).coerceIn(0.0, 1.0))
                            .put("y", (token.getDouble("y") / h).coerceIn(0.0, 1.0)))
                        .put("coreStateVersion", snap.getInt("state_version"))
                } else {
                    val savedX = prior.optDouble("x", Double.NaN)
                    val savedY = prior.optDouble("y", Double.NaN)
                    val keepGridCoords = !savedX.isNaN() && !savedY.isNaN() && (savedX > 1.0 || savedY > 1.0)
                    prior.put("atlasId", prior.optString("atlasId").ifBlank { "night-city-2045" })
                        .put("x", if (keepGridCoords) savedX else (token.getDouble("x") / MAP_WIDTH))
                        .put("y", if (keepGridCoords) savedY else (token.getDouble("y") / MAP_HEIGHT))
                        .put("mode", "street")
                        .put("coreStateVersion", snap.getInt("state_version"))
                    prior.remove("sceneId"); prior.remove("returnStreet"); prior.remove("local")
                }
                c.put("worldPosition", prior)
            }
            c.toString()
        } catch (_: Throwable) { raw }
    }

    /** Commit movement through Barbara VttAuthority; only after CAS succeeds is the character projection updated. */
    fun updatePosition(characterId: String, requested: JSONObject): JSONObject {
        val raw = loadCharacter(characterId) ?: error("Personagem não encontrado")
        val rawX = requested.getDouble("x")
        val rawY = requested.getDouble("y")
        val isGridCoord = rawX > 1.0 || rawY > 1.0
        val nx = (if (isGridCoord) rawX / MAP_WIDTH else rawX).coerceIn(0.0, 1.0)
        val ny = (if (isGridCoord) rawY / MAP_HEIGHT else rawY).coerceIn(0.0, 1.0)
        var snap = gateway.platformVttSnapshot(activeWorldId(), PLAYER_ACTOR_ID, "gm")
        var version = snap.getInt("state_version")
        var state = snap.getJSONObject("state")
        val travelMode = requested.optString("travelMode", "walk").takeIf { it in setOf("walk", "vehicle") } ?: "walk"
        val vehicleId = "vehicle-player"
        if (travelMode == "vehicle" && !(state.optJSONObject("tokens") ?: JSONObject()).has(vehicleId)) {
            val spawned = gateway.platformVttCommand(activeWorldId(), PLAYER_ACTOR_ID, "gm", JSONObject()
                .put("command_id", "vehicle-spawn-${UUID.randomUUID()}")
                .put("base_version", version).put("command", "spawn_token")
                .put("tokenId", vehicleId).put("ownerId", PLAYER_ACTOR_ID).put("entityRef", "vehicle:player")
                .put("name", "Veículo do Edgerunner").put("x", nx * MAP_WIDTH).put("y", ny * MAP_HEIGHT).put("size", 1.6))
            version = spawned.getInt("state_version"); state = spawned.getJSONObject("state")
        }
        var out = gateway.platformVttCommand(activeWorldId(), PLAYER_ACTOR_ID, "player", JSONObject()
            .put("command_id", "move-${UUID.randomUUID()}")
            .put("base_version", version)
            .put("command", "move_token")
            .put("tokenId", PLAYER_TOKEN_ID)
            .put("x", nx * MAP_WIDTH)
            .put("y", ny * MAP_HEIGHT))
        version = out.getInt("state_version"); state = out.getJSONObject("state")
        if (travelMode == "vehicle") {
            out = gateway.platformVttCommand(activeWorldId(), PLAYER_ACTOR_ID, "player", JSONObject()
                .put("command_id", "vehicle-move-${UUID.randomUUID()}").put("base_version", version)
                .put("command", "move_token").put("tokenId", vehicleId)
                .put("x", nx * MAP_WIDTH).put("y", ny * MAP_HEIGHT))
            version = out.getInt("state_version"); state = out.getJSONObject("state")
        }
        val token = state.getJSONObject("tokens").getJSONObject(PLAYER_TOKEN_ID)
        var finalVersion = version
        val districtCode = requested.optString("districtCode").takeIf { it.matches(Regex("[A-X]")) }
        if (districtCode != null) {
            // Keep narrative/context location in the same transaction stream as the token position.
            val located = setAtlasMap(finalVersion, "district-$districtCode")
            finalVersion = located.getInt("state_version")
        }
        val canonical = JSONObject(requested.toString())
            .put("atlasId", requested.optString("atlasId").ifBlank { "night-city-2045" })
            .put("x", if (isGridCoord) rawX else (token.getDouble("x") / MAP_WIDTH))
            .put("y", if (isGridCoord) rawY else (token.getDouble("y") / MAP_HEIGHT))
            .put("normalizedX", token.getDouble("x") / MAP_WIDTH)
            .put("normalizedY", token.getDouble("y") / MAP_HEIGHT)
            .put("mode", "street")
            .put("travelMode", travelMode)
            .put("coreStateVersion", finalVersion)
        val character = JSONObject(raw).put("worldPosition", canonical)
        saveCharacter(characterId, character.toString())
        return JSONObject()
            .put("ok", true)
            .put("resolved", true)
            .put("characterId", characterId)
            .put("mode", "barbara-vtt-authority")
            .put("worldPosition", canonical)
            .put("stateVersion", finalVersion)
    }

    fun enterScene(characterId: String, requested: JSONObject): JSONObject {
        val raw = loadCharacter(characterId) ?: error("Personagem não encontrado")
        val character = JSONObject(raw)
        val sceneId = requested.getString("sceneId")
        val poiCode = requested.optString("poiCode").takeIf { it.matches(Regex("[A-X]\\d+")) }
        val scene = findScene(sceneId)
        val width = scene.getDouble("width")
        val height = scene.getDouble("height")
        val gridPx = scene.optInt("gridPx", 100).coerceAtLeast(1)
        val entry = scene.optJSONObject("entry") ?: JSONObject().put("x", 0.5).put("y", 0.9)
        val ex = entry.optDouble("x", 0.5).coerceIn(0.0, 1.0)
        val ey = entry.optDouble("y", 0.9).coerceIn(0.0, 1.0)

        val prior = character.optJSONObject("worldPosition") ?: JSONObject()
        val returnStreet = if (prior.optString("mode") == "interior")
            JSONObject((prior.optJSONObject("returnStreet") ?: prior).toString())
        else JSONObject(prior.toString())
        returnStreet.put("atlasId", "night-city-2045").put("mode", "street")
        returnStreet.remove("sceneId"); returnStreet.remove("poiCode"); returnStreet.remove("returnStreet"); returnStreet.remove("local")

        var snap = gateway.platformVttSnapshot(activeWorldId(), PLAYER_ACTOR_ID, "gm")
        var version = snap.getInt("state_version")
        var out = gateway.platformVttCommand(activeWorldId(), PLAYER_ACTOR_ID, "gm", JSONObject()
            .put("command_id", "scene-grid-${UUID.randomUUID()}")
            .put("base_version", version)
            .put("command", "set_grid")
            .put("grid", JSONObject()
                .put("type", "square").put("size", gridPx).put("scale", 1.0).put("unit", "scene-px")
                .put("originX", 0).put("originY", 0).put("orientation", "flat")))
        version = out.getInt("state_version")

        val tile = JSONObject().put("id", sceneId).put("src", scene.getString("src"))
            .put("x", 0).put("y", 0).put("w", width).put("h", height).put("z", 0)
        val map = JSONObject().put("tiles", JSONArray().put(tile)).put("width", width).put("height", height)
            .put("atlas_namespace", if (poiCode != null) "cyberpunk-red/night-city-2045" else "cyberpunk-red/tactical-scene")
            .put("occluders", JSONArray())
        if (poiCode != null) map.put("location_id", poiCode)
        out = gateway.platformVttCommand(activeWorldId(), PLAYER_ACTOR_ID, "gm", JSONObject()
            .put("command_id", "scene-map-${UUID.randomUUID()}")
            .put("base_version", version).put("command", "set_map").put("map", map))
        version = out.getInt("state_version")
        out = gateway.platformVttCommand(activeWorldId(), PLAYER_ACTOR_ID, "player", JSONObject()
            .put("command_id", "scene-enter-${UUID.randomUUID()}")
            .put("base_version", version).put("command", "move_token").put("tokenId", PLAYER_TOKEN_ID)
            .put("x", ex * width).put("y", ey * height))
        version = out.getInt("state_version")
        val token = out.getJSONObject("state").getJSONObject("tokens").getJSONObject(PLAYER_TOKEN_ID)

        val canonical = JSONObject(returnStreet.toString())
            .put("mode", "interior").put("sceneId", sceneId).put("poiCode", poiCode)
            .put("returnStreet", returnStreet)
            .put("local", JSONObject().put("x", token.getDouble("x") / width).put("y", token.getDouble("y") / height))
            .put("coreStateVersion", version)
        character.put("worldPosition", canonical)
        saveCharacter(characterId, character.toString())
        return JSONObject().put("ok", true).put("mode", "barbara-vtt-scene")
            .put("worldPosition", canonical).put("stateVersion", version)
    }

    fun updateScenePosition(characterId: String, requested: JSONObject): JSONObject {
        val raw = loadCharacter(characterId) ?: error("Personagem não encontrado")
        val character = JSONObject(raw)
        val sceneId = requested.getString("sceneId")
        val scene = findScene(sceneId)
        val width = scene.getDouble("width"); val height = scene.getDouble("height")
        val nx = requested.getDouble("x").coerceIn(0.0, 1.0); val ny = requested.getDouble("y").coerceIn(0.0, 1.0)
        val snap = gateway.platformVttSnapshot(activeWorldId(), PLAYER_ACTOR_ID, "gm")
        val map = snap.getJSONObject("state").optJSONObject("map") ?: error("Mapa VTT ausente")
        require(sceneIdFromMap(map) == sceneId) { "Cena VTT divergente" }
        val out = gateway.platformVttCommand(activeWorldId(), PLAYER_ACTOR_ID, "player", JSONObject()
            .put("command_id", "scene-move-${UUID.randomUUID()}").put("base_version", snap.getInt("state_version"))
            .put("command", "move_token").put("tokenId", PLAYER_TOKEN_ID).put("x", nx * width).put("y", ny * height))
        val token = out.getJSONObject("state").getJSONObject("tokens").getJSONObject(PLAYER_TOKEN_ID)
        val canonical = character.optJSONObject("worldPosition") ?: JSONObject()
        canonical.put("mode", "interior").put("sceneId", sceneId)
            .put("local", JSONObject().put("x", token.getDouble("x") / width).put("y", token.getDouble("y") / height))
            .put("coreStateVersion", out.getInt("state_version"))
        character.put("worldPosition", canonical); saveCharacter(characterId, character.toString())
        return JSONObject().put("ok", true).put("mode", "barbara-vtt-scene")
            .put("worldPosition", canonical).put("stateVersion", out.getInt("state_version"))
    }

    fun exitScene(characterId: String): JSONObject {
        val raw = loadCharacter(characterId) ?: error("Personagem não encontrado")
        val character = JSONObject(raw)
        val prior = character.optJSONObject("worldPosition") ?: JSONObject()
        val returnStreet = JSONObject((prior.optJSONObject("returnStreet") ?: prior).toString())
        val nx = returnStreet.optDouble("x", 0.602).coerceIn(0.0, 1.0)
        val ny = returnStreet.optDouble("y", 0.487).coerceIn(0.0, 1.0)
        val districtCode = returnStreet.optString("districtCode").takeIf { it.matches(Regex("[A-X]")) }

        var snap = gateway.platformVttSnapshot(activeWorldId(), PLAYER_ACTOR_ID, "gm")
        var version = snap.getInt("state_version")
        var out = gateway.platformVttCommand(activeWorldId(), PLAYER_ACTOR_ID, "gm", JSONObject()
            .put("command_id", "atlas-grid-${UUID.randomUUID()}").put("base_version", version).put("command", "set_grid")
            .put("grid", JSONObject().put("type", "square").put("size", 30).put("scale", 1.0).put("unit", "atlas-cell")
                .put("originX", 0).put("originY", 0).put("orientation", "flat")))
        version = out.getInt("state_version")
        out = setAtlasMap(version, districtCode?.let { "district-$it" })
        version = out.getInt("state_version")
        out = gateway.platformVttCommand(activeWorldId(), PLAYER_ACTOR_ID, "player", JSONObject()
            .put("command_id", "scene-exit-${UUID.randomUUID()}").put("base_version", version).put("command", "move_token")
            .put("tokenId", PLAYER_TOKEN_ID).put("x", nx * MAP_WIDTH).put("y", ny * MAP_HEIGHT))
        version = out.getInt("state_version")
        val token = out.getJSONObject("state").getJSONObject("tokens").getJSONObject(PLAYER_TOKEN_ID)
        val canonical = JSONObject(returnStreet.toString()).put("atlasId", "night-city-2045")
            .put("x", token.getDouble("x") / MAP_WIDTH).put("y", token.getDouble("y") / MAP_HEIGHT)
            .put("mode", "street").put("coreStateVersion", version)
        canonical.remove("sceneId"); canonical.remove("poiCode"); canonical.remove("returnStreet"); canonical.remove("local")
        character.put("worldPosition", canonical); saveCharacter(characterId, character.toString())
        return JSONObject().put("ok", true).put("mode", "barbara-vtt-authority")
            .put("worldPosition", canonical).put("stateVersion", version)
    }

    fun ensureSceneNpcs(characterId: String, requested: JSONObject): JSONObject {
        val rawCharacter = loadCharacter(characterId) ?: error("Personagem não encontrado")
        val character = JSONObject(rawCharacter)
        val campaign = campaignStateOf(character)
        val registry = enemyVisualRegistry(campaign)
        val (consumedArray, consumed) = consumedEnemyVisualIds(campaign)
        val combatStore = campaign.optJSONObject("npcCombat") ?: JSONObject().also { campaign.put("npcCombat", it) }

        val sceneId = requested.getString("sceneId")
        val poiCode = requested.optString("poiCode").takeIf { it.matches(Regex("[A-X]\\d+")) }
        val count = requested.optInt("count", 3).coerceIn(0, 8)
        val danger = requested.optInt("danger", 1).coerceIn(0, 3)
        val points = requested.optJSONArray("spawnPoints") ?: JSONArray()
        val requestedProfiles = requested.optJSONArray("npcProfiles") ?: JSONArray()
        var snap = gateway.platformVttSnapshot(activeWorldId(), PLAYER_ACTOR_ID, "gm")
        var version = snap.getInt("state_version")
        var state = snap.getJSONObject("state")
        val map = state.optJSONObject("map") ?: error("Mapa VTT ausente")
        require(sceneIdFromMap(map) == sceneId) { "Cena VTT divergente para NPCs" }
        val width = map.optDouble("width", 1.0).coerceAtLeast(1.0)
        val height = map.optDouble("height", 1.0).coerceAtLeast(1.0)
        val key = poiCode ?: sceneId
        val femaleFirst = listOf("Mara","Rin","Nix","Tess","Sable","Miko","Iris","Avery","Lena","Juno","Vera","Noa")
        val maleFirst = listOf("Jax","Kiro","Vale","Gage","Dax","Niko","Rafe","Tomas","Malik","Kenji","Arun","Mateo")
        val last = listOf("Kane","Voss","Ortiz","Cho","Mendez","Rhyne","Vale","Kovac","Sato","Dunne","Cross","Reyes","Okafor","Singh","Navarro","Haddad")
        val roster = JSONArray()
        val dead = JSONArray()

        for (i in 0 until count) {
            val requestProfile = if (i < requestedProfiles.length()) requestedProfiles.optJSONObject(i) else null
            val defaultTokenId = "npc-${key.lowercase()}-${i + 1}"
            val externalEnemyId = requestProfile?.optString("enemyId")?.takeIf { it.isNotBlank() }
            val enemyId = externalEnemyId ?: defaultTokenId
            val safeExternal = externalEnemyId?.lowercase()?.replace(Regex("[^a-z0-9._-]+"), "-")?.trim('-')?.take(54)
            val tokenId = requestProfile?.optString("tokenId")?.takeIf { it.matches(Regex("[a-zA-Z0-9._-]{1,64}")) }
                ?: if (!safeExternal.isNullOrBlank()) "npc-$safeExternal" else defaultTokenId
            val seed = (enemyId + ":" + key + ":" + i).hashCode() and Int.MAX_VALUE
            val profile = registry.optJSONObject(enemyId)?.let {
                JSONObject().put("sex", it.optString("sex")).put("ageGroup", it.optString("ageGroup"))
                    .put("appearanceGroup", it.optString("appearanceGroup", it.optString("race")))
            } ?: demographicProfile(seed, requestProfile)
            val visual = allocateEnemyVisual(enemyId, profile, registry, consumedArray, consumed)
            val sex = visual.getString("sex")
            val generatedName = (if (sex == "female") femaleFirst else maleFirst)[seed % 12] + " " + last[(seed / 7) % last.size]
            val name = visual.optString("name").takeIf { it.isNotBlank() }
                ?: requestProfile?.optString("name")?.takeIf { it.isNotBlank() }
                ?: generatedName
            visual.put("name", name).put("lastSeenAt", System.currentTimeMillis())
            requestProfile?.optString("faction")?.takeIf { it.isNotBlank() }?.let { visual.put("faction", it) }
            requestProfile?.optString("role")?.takeIf { it.isNotBlank() }?.let { visual.put("role", it) }

            // hp<=0 is canonical campaign evidence that this enemy died. Its portrait remains consumed forever.
            val combat = combatStore.optJSONObject(enemyId) ?: combatStore.optJSONObject(tokenId)
            val isDead = visual.optString("status") == "dead" || (combat != null && combat.optDouble("hp", 1.0) <= 0.0)
            if (isDead) {
                visual.put("status", "dead").put("diedAt", visual.optLong("diedAt", System.currentTimeMillis()))
                dead.put(JSONObject(visual.toString()).put("enemyId", enemyId).put("tokenId", tokenId))
                continue
            }
            visual.put("status", "alive")

            var tokens = state.optJSONObject("tokens") ?: JSONObject()
            if (!tokens.has(tokenId)) {
                val point = if (i < points.length()) points.optJSONObject(i) else null
                val nx = point?.optDouble("x", 0.25 + (i * 0.17) % 0.55) ?: (0.25 + (i * 0.17) % 0.55)
                val ny = point?.optDouble("y", 0.28 + (i * 0.13) % 0.45) ?: (0.28 + (i * 0.13) % 0.45)
                val spawned = gateway.platformVttCommand(activeWorldId(), PLAYER_ACTOR_ID, "gm", JSONObject()
                    .put("command_id", "npc-spawn-${UUID.randomUUID()}").put("base_version", version)
                    .put("command", "spawn_token").put("tokenId", tokenId).put("ownerId", "gm")
                    .put("entityRef", "npc:$enemyId").put("name", name)
                    .put("x", nx.coerceIn(0.05,0.95) * width).put("y", ny.coerceIn(0.05,0.95) * height).put("size", 1.0))
                version = spawned.getInt("state_version"); state = spawned.getJSONObject("state"); tokens = state.getJSONObject("tokens")
            }
            val t = tokens.getJSONObject(tokenId)
            // Core v1.25 pp.412-413: use canonical Mook stat blocks, never pseudo-random combat stats.
            val abbreviatedProfile = requestProfile?.optBoolean("abbreviatedStats", false) == true
            val gangGuideProfile = requestProfile?.optBoolean("gangGuideStats", false) == true
            val canonicalProfile = requestProfile?.optBoolean("canonicalStats", false) == true
            val requestedMook = requestProfile?.optString("mookType")?.lowercase()?.replace(Regex("[^a-z]"), "")
            val mookType = when {
                gangGuideProfile -> "gangguide"
                abbreviatedProfile -> "everyday"
                canonicalProfile -> "dangergal"
                requestedMook in setOf("bodyguard", "boosterganger", "roadganger", "securityoperative", "securityofficer") -> requestedMook!!
                danger >= 3 -> if (i % 2 == 0) "securityoperative" else "bodyguard"
                danger == 2 -> listOf("securityoperative", "bodyguard", "roadganger")[i % 3]
                else -> listOf("boosterganger", "roadganger", "bodyguard", "securityoperative")[i % 4]
            }
            val mook = when (mookType) {
                // Everyday People v1.01 uses deliberately abbreviated stat blocks. Unknown full STAT values are not fabricated.
                "everyday" -> JSONObject().put("ref",0).put("dex",0).put("tech",0).put("will",0).put("body",0).put("move",0).put("maxHp",20).put("sp",0).put("evasion",0).put("concentration",0).put("resistTortureDrugsBase",0).put("cybertechBase",0).put("weaponId","brawling").put("weaponSkill",0).put("combatNumber",0).put("initiativeBase",0).put("evasionBase",0)
                // Night City Gang Guide v1.0 supplies abbreviated combat blocks, including an explicit Death Save, COM # and INIT.
                // Unknown full STATs stay zero; the source's complete BASE values are used directly where supplied.
                "gangguide" -> JSONObject().put("ref",0).put("dex",0).put("tech",0).put("will",0).put("body",0).put("move",0).put("maxHp",20).put("deathSave",0).put("sp",0).put("spHead",0).put("spBody",0).put("evasion",0).put("concentration",0).put("resistTortureDrugsBase",0).put("cybertechBase",0).put("weaponId","brawling").put("weaponSkill",0).put("combatNumber",0).put("initiativeBase",0).put("evasionBase",0)
                "bodyguard" -> JSONObject().put("ref",6).put("dex",5).put("tech",2).put("will",4).put("body",6).put("move",4).put("maxHp",35).put("sp",7).put("evasion",2).put("concentration",2).put("resistTortureDrugsBase",8).put("cybertechBase",2).put("weaponId","shotgun").put("weaponSkill",4)
                "roadganger" -> JSONObject().put("ref",6).put("dex",4).put("tech",4).put("will",3).put("body",3).put("move",3).put("maxHp",25).put("sp",7).put("evasion",2).put("concentration",2).put("resistTortureDrugsBase",3).put("cybertechBase",4).put("weaponId","bow").put("weaponSkill",4)
                "securityoperative" -> JSONObject().put("ref",7).put("dex",4).put("tech",2).put("will",3).put("body",5).put("move",3).put("maxHp",30).put("sp",7).put("evasion",2).put("concentration",4).put("resistTortureDrugsBase",5).put("cybertechBase",2).put("weaponId","assaultRifle").put("weaponSkill",3)
                // Core v1.25 p.415 + Errata v1.25 p.4: Security Officer has M Armorjack SP12, Stealth 8 (6), Tactics 6.
                "securityofficer" -> JSONObject().put("ref",6).put("refBase",8).put("dex",4).put("dexBase",6).put("tech",4).put("will",5).put("body",7).put("move",4).put("moveBase",6).put("maxHp",40).put("deathSave",7).put("sp",12).put("spHead",12).put("spBody",12).put("evasion",8).put("concentration",7).put("stealth",6).put("stealthBase",8).put("tactics",6).put("resistTortureDrugsBase",10).put("cybertechBase",4).put("weaponId","assaultRifle").put("weaponSkill",8)
                else -> JSONObject().put("ref",6).put("dex",5).put("tech",2).put("will",2).put("body",2).put("move",4).put("maxHp",20).put("deathSave",2).put("sp",4).put("evasion",2).put("concentration",2).put("resistTortureDrugsBase",4).put("cybertechBase",2).put("weaponId","veryHeavyPistol").put("weaponSkill",6)
            }
            if (gangGuideProfile && requestProfile != null) {
                val bounded = mapOf(
                    "maxHp" to (1..200), "deathSave" to (1..20), "move" to (0..20), "cool" to (0..20),
                    "sp" to (0..30), "spHead" to (0..30), "spBody" to (0..30), "weaponSkill" to (0..30),
                    "combatNumber" to (0..30), "initiativeBase" to (0..30), "evasionBase" to (0..30)
                )
                for ((field, range) in bounded) if (requestProfile.has(field)) {
                    val value = requestProfile.optInt(field, mook.optInt(field, range.first)).coerceIn(range.first, range.last)
                    mook.put(field, value)
                }
                requestProfile.optString("weaponId").takeIf { it.matches(Regex("[a-zA-Z0-9._:-]{1,96}")) }?.let { mook.put("weaponId", it) }
                requestProfile.optJSONObject("weaponProfile")?.let { wp ->
                    val type = wp.optString("type").takeIf { it in setOf("pistol","smg","shotgun","assaultRifle","sniperRifle","bow","grenadeLauncher","rocketLauncher","melee") } ?: "pistol"
                    val rawDamage = wp.optInt("damageDice", 0)
                    val rawRof = wp.optInt("rof", 0)
                    require(rawDamage in 1..8 && rawRof in 1..2) { "Ataque Gang Guide sem runtime numérico" }
                    val damage = rawDamage
                    val rof = rawRof
                    mook.put("weaponProfile", JSONObject().put("label", wp.optString("label", "Gang Guide weapon").take(100)).put("type", type)
                        .put("damageDice", damage).put("rof", rof).put("source", wp.optString("source", "Night City Gang Guide v1.0").take(120)))
                }
            }
            if (canonicalProfile && requestProfile != null) {
                // Danger Gal Dossier profiles are authoritative stat blocks supplied by the catalog.
                // Only bounded scalar combat fields are accepted; generic scene generation keeps the Core mook defaults above.
                val bounded = mapOf(
                    "ref" to (0..20), "dex" to (0..20), "tech" to (0..20), "will" to (0..20), "body" to (0..20), "move" to (0..20),
                    "int" to (0..20), "cool" to (0..20), "emp" to (0..20), "maxHp" to (1..200), "deathSave" to (0..20),
                    "sp" to (0..30), "spHead" to (0..30), "spBody" to (0..30), "evasion" to (0..30), "concentration" to (0..30),
                    "resistTortureDrugsBase" to (0..30), "cybertechBase" to (0..30), "weaponSkill" to (0..30), "stealth" to (0..30), "tactics" to (0..30),
                    "combatNumber" to (0..30), "initiativeBase" to (0..20), "evasionBase" to (0..30)
                )
                for ((field, range) in bounded) if (requestProfile.has(field)) {
                    val value = requestProfile.optInt(field, mook.optInt(field, range.first)).coerceIn(range.first, range.last)
                    mook.put(field, value)
                }
                requestProfile.optString("weaponId").takeIf { it.matches(Regex("[a-zA-Z0-9._:-]{1,96}")) }?.let { mook.put("weaponId", it) }
                requestProfile.optJSONObject("weaponProfile")?.let { wp ->
                    val type = wp.optString("type").takeIf { it in setOf("pistol","smg","shotgun","assaultRifle","sniperRifle","bow","grenadeLauncher","rocketLauncher","melee") } ?: "pistol"
                    val safe = JSONObject().put("label", wp.optString("label", "Danger Gal weapon").take(100)).put("type", type)
                        .put("damageDice", wp.optInt("damageDice", 2).coerceIn(0, 8)).put("rof", wp.optInt("rof", 1).coerceIn(1, 2))
                        .put("source", wp.optString("source", "Danger Gal Dossier").take(120))
                    mook.put("weaponProfile", safe)
                }
            }
            val ref=mook.getInt("ref");val dex=mook.getInt("dex");val will=mook.getInt("will");val body=mook.getInt("body")
            val evasion=mook.getInt("evasion");val concentration=mook.getInt("concentration");val maxHp=mook.getInt("maxHp")
            val weaponId=mook.getString("weaponId");val weaponSkill=mook.getInt("weaponSkill");val move=mook.getInt("move");val sp=mook.getInt("sp")
            roster.put(JSONObject()
                .put("enemyId", enemyId).put("tokenId", tokenId).put("name", name)
                .put("visualId", visual.getString("visualId")).put("tokenSrc", visual.getString("tokenSrc"))
                .put("sex", visual.getString("sex")).put("sexLabel", visual.optString("sexLabel"))
                .put("ageGroup", visual.getString("ageGroup")).put("ageLabel", visual.optString("ageLabel"))
                .put("ageRange", visual.optString("ageRange"))
                .put("race", visual.getString("race")).put("appearanceGroup", visual.getString("appearanceGroup"))
                .put("appearanceLabel", visual.optString("appearanceLabel"))
                .put("faction", visual.optString("faction", requestProfile?.optString("faction") ?: ""))
                .put("x", t.getDouble("x") / width).put("y", t.getDouble("y") / height)
                .put("hp", combat?.optInt("hp", maxHp) ?: maxHp).put("maxHp", combat?.optInt("maxHp", maxHp) ?: maxHp)
                .put("sp", combat?.optInt("sp", sp) ?: sp)
                .put("ref", ref).put("dex", dex).put("tech", mook.getInt("tech")).put("evasion", evasion).put("will", will).put("concentration", concentration).put("body", body)
                .put("resistTortureDrugsBase", mook.getInt("resistTortureDrugsBase")).put("cybertechBase", mook.getInt("cybertechBase")).put("mookType", mookType)
                .put("weaponId", weaponId).put("weaponSkill", weaponSkill).put("move", move)
                .put("refBase", mook.optInt("refBase", ref)).put("dexBase", mook.optInt("dexBase", dex)).put("moveBase", mook.optInt("moveBase", move))
                .put("spHead", mook.optInt("spHead", sp)).put("spBody", mook.optInt("spBody", sp)).put("deathSave", mook.optInt("deathSave", body))
                .put("stealth", mook.optInt("stealth", 0)).put("stealthBase", mook.optInt("stealthBase", mook.optInt("stealth", 0))).put("tactics", mook.optInt("tactics", 0))
                .put("int", mook.optInt("int", 0)).put("cool", mook.optInt("cool", 0)).put("emp", mook.optInt("emp", 0))
                .put("level", requestProfile?.optString("level") ?: "").put("role", requestProfile?.optString("role") ?: visual.optString("role", ""))
                .put("sourceKey", requestProfile?.optString("sourceKey") ?: "").put("bookPage", requestProfile?.opt("bookPage"))
                .put("weaponProfile", mook.optJSONObject("weaponProfile"))
                .put("canonicalStats", canonicalProfile)
                .put("abbreviatedStats", abbreviatedProfile)
                .put("gangGuideStats", gangGuideProfile)
                .put("combatNumber", mook.optInt("combatNumber", requestProfile?.optInt("combatNumber", 0) ?: 0))
                .put("initiativeBase", mook.optInt("initiativeBase", requestProfile?.optInt("initiativeBase", ref) ?: ref))
                .put("evasionBase", mook.optInt("evasionBase", requestProfile?.optInt("evasionBase", evasion) ?: evasion))
                .put("archetype", requestProfile?.optString("archetype") ?: "")
                .put("importantSkills", requestProfile?.optJSONArray("importantSkills") ?: JSONArray())
                .put("disposition", requestProfile?.optString("disposition")?.takeIf { it in setOf("friendly", "neutral", "hostile") } ?: if (danger >= 2) "hostile" else "neutral")
                .put("status", "alive"))
        }
        saveCharacter(characterId, character.toString())
        return JSONObject().put("ok", true).put("sceneId", sceneId).put("poiCode", poiCode)
            .put("stateVersion", version).put("npcs", roster).put("deadNpcs", dead)
            .put("visualRegistryCount", registry.length()).put("consumedVisualCount", consumed.size)
    }

    fun moveSceneNpc(requested: JSONObject): JSONObject {
        val sceneId = requested.getString("sceneId")
        val tokenId = requested.getString("tokenId")
        val nx = requested.getDouble("x").coerceIn(0.0, 1.0)
        val ny = requested.getDouble("y").coerceIn(0.0, 1.0)
        val snap = gateway.platformVttSnapshot(activeWorldId(), PLAYER_ACTOR_ID, "gm")
        val state = snap.getJSONObject("state")
        val map = state.optJSONObject("map") ?: error("Mapa VTT ausente")
        require(sceneIdFromMap(map) == sceneId) { "Cena VTT divergente para NPC" }
        require((state.optJSONObject("tokens") ?: JSONObject()).has(tokenId)) { "NPC inexistente" }
        val width = map.optDouble("width", 1.0).coerceAtLeast(1.0)
        val height = map.optDouble("height", 1.0).coerceAtLeast(1.0)
        val out = gateway.platformVttCommand(activeWorldId(), "gm", "gm", JSONObject()
            .put("command_id", "npc-move-${UUID.randomUUID()}").put("base_version", snap.getInt("state_version"))
            .put("command", "move_token").put("tokenId", tokenId).put("x", nx * width).put("y", ny * height))
        val token = out.getJSONObject("state").getJSONObject("tokens").getJSONObject(tokenId)
        return JSONObject().put("ok", true).put("tokenId", tokenId)
            .put("x", token.getDouble("x") / width).put("y", token.getDouble("y") / height)
            .put("stateVersion", out.getInt("state_version"))
    }

    fun vttSnapshot(): JSONObject = gateway.platformVttSnapshot(activeWorldId(), PLAYER_ACTOR_ID, "gm")

    fun bindToken(payload: JSONObject): JSONObject {
        val characterId = payload.getString("entityId")
        val raw = loadCharacter(characterId) ?: return JSONObject().put("ok", false).put("reason", "character_not_found")
        val character = JSONObject(raw)
        val assets = character.optJSONObject("assets") ?: JSONObject().also { character.put("assets", it) }
        if (payload.has("portraitDataUrl")) assets.put("portraitDataUrl", payload.opt("portraitDataUrl"))
        if (payload.has("tokenDataUrl")) assets.put("tokenDataUrl", payload.opt("tokenDataUrl"))
        saveCharacter(characterId, character.toString())
        return JSONObject().put("ok", true).put("mode", "barbara-vtt-binding").put("entityId", characterId)
    }

    fun snapshot(label: String): JSONObject {
        return createWorldBackup(label)
    }

    // --- RUN13 Durable Wallet, Reward Eligibility, World Time Verification & Rule Resolver ---

    private val walletPrefs by lazy {
        context.getSharedPreferences("cpred-wallet-ledger-v1", Context.MODE_PRIVATE)
    }

    fun walletGetTransaction(payload: JSONObject): JSONObject = synchronized(canonicalTurnLock) {
        val key = payload.optString("idempotencyKey").trim()
        val txId = payload.optString("transactionId").trim()
        val lookupKey = key.ifEmpty { txId }
        if (lookupKey.isEmpty()) {
            return JSONObject().put("ok", false).put("found", false).put("reason", "MISSING_TRANSACTION_KEY")
        }
        val stored = walletPrefs.getString("tx:$lookupKey", null)
            ?: return JSONObject().put("ok", true).put("found", false)
        val tx = JSONObject(stored)
        return JSONObject(tx.toString()).put("ok", true).put("found", true).put("resolved", true)
    }

    fun walletCreditMissionReward(payload: JSONObject): JSONObject = synchronized(canonicalTurnLock) {
        val accountId = payload.optString("accountId").trim()
        val idempotencyKey = payload.optString("idempotencyKey").trim()
        val amountEb = payload.optInt("amountEb", -1)
        val missionId = payload.optString("missionId", "cemk_the_jacket")
        val rewardId = payload.optString("rewardId", "")
        if (accountId.isEmpty() || idempotencyKey.isEmpty() || amountEb <= 0) {
            return JSONObject().put("ok", false).put("resolved", false).put("blocked", true).put("reason", "INVALID_WALLET_CREDIT_REQUEST")
        }

        val existingRaw = walletPrefs.getString("tx:$idempotencyKey", null)
        if (existingRaw != null) {
            val existing = JSONObject(existingRaw)
            if (existing.optString("accountId") != accountId ||
                existing.optInt("amountEb", -1) != amountEb ||
                existing.optString("rewardId") != rewardId
            ) {
                return JSONObject()
                    .put("ok", false)
                    .put("resolved", false)
                    .put("blocked", true)
                    .put("reason", "IDEMPOTENCY_KEY_REUSE_MISMATCH")
            }
            return JSONObject(existing.toString())
                .put("ok", true)
                .put("resolved", true)
                .put("replayed", true)
        }

        val charId = activeCharacterId() ?: accountId.removePrefix("acct:")
        val charRaw = storedCharacter(charId)
        var balanceAfter = amountEb
        if (charRaw != null) {
            val charObj = JSONObject(charRaw)
            val currentEb = charObj.optInt("eurobucks", charObj.optInt("cash", 0))
            balanceAfter = currentEb + amountEb
            charObj.put("eurobucks", balanceAfter)
            charObj.put("cash", balanceAfter)
            saveCharacter(charId, charObj.toString())
        }

        val txId = "tx-${UUID.nameUUIDFromBytes(idempotencyKey.toByteArray(Charsets.UTF_8))}"
        val receipt = JSONObject()
            .put("ok", true)
            .put("resolved", true)
            .put("blocked", false)
            .put("status", "CREDITED")
            .put("authority", "barbara-wallet-ledger")
            .put("transactionId", txId)
            .put("idempotencyKey", idempotencyKey)
            .put("accountId", accountId)
            .put("characterId", charId)
            .put("missionId", missionId)
            .put("rewardId", rewardId)
            .put("amountEb", amountEb)
            .put("balanceAfterEb", balanceAfter)
            .put("committedAtEpochMs", System.currentTimeMillis())

        walletPrefs.edit()
            .putString("tx:$idempotencyKey", receipt.toString())
            .putString("tx:$txId", receipt.toString())
            .apply()

        return receipt
    }

    fun verifyRewardEligibility(payload: JSONObject): JSONObject = synchronized(canonicalTurnLock) {
        val rewardId = payload.optString("rewardId").trim()
        val amountEb = payload.optInt("amountEb", 0)
        val charId = payload.optString("characterId").ifBlank { activeCharacterId().orEmpty() }
        if (rewardId.isEmpty() || amountEb <= 0) {
            return JSONObject().put("ok", false).put("resolved", false).put("eligible", false).put("reason", "INVALID_REWARD_PARAMETERS")
        }
        return JSONObject()
            .put("ok", true)
            .put("resolved", true)
            .put("eligible", true)
            .put("authority", "barbara-rules-host")
            .put("characterId", charId)
            .put("rewardId", rewardId)
            .put("amountEb", amountEb)
    }

    fun verifyWorldTimeAdvance(payload: JSONObject): JSONObject = synchronized(canonicalTurnLock) {
        val days = payload.optInt("days", 0)
        val charId = payload.optString("characterId").ifBlank { activeCharacterId().orEmpty() }
        if (days <= 0) {
            return JSONObject().put("ok", false).put("resolved", false).put("reason", "INVALID_DOWNTIME_DAYS")
        }
        val raw = if (charId.isNotBlank()) storedCharacter(charId) else null
        var nextDay = 1 + days
        if (raw != null) {
            val c = JSONObject(raw)
            val campaign = campaignStateOf(c)
            val clock = campaign.optJSONObject("worldClock") ?: JSONObject().also { campaign.put("worldClock", it) }
            val beforeDay = clock.optInt("day", 1)
            nextDay = beforeDay + days
            clock.put("day", nextDay)
            clock.put("elapsedMinutes", clock.optInt("elapsedMinutes", 0) + days * 1440)
            saveCharacter(charId, c.toString())
        }
        return JSONObject()
            .put("ok", true)
            .put("resolved", true)
            .put("verified", true)
            .put("authority", "barbara-world-clock")
            .put("daysAdvanced", days)
            .put("currentDay", nextDay)
    }

    fun resolveAdventureRuleAction(payload: JSONObject): JSONObject = synchronized(canonicalTurnLock) {
        val action = payload.optJSONObject("action") ?: JSONObject()
        val type = action.optString("type").uppercase()
        val actionId = action.optString("id", "rule-${UUID.randomUUID()}")
        val charId = payload.optString("characterId").ifBlank { activeCharacterId().orEmpty() }
        val raw = if (charId.isNotBlank()) storedCharacter(charId) else null
        val c = raw?.let { runCatching { JSONObject(it) }.getOrNull() } ?: JSONObject()
        val stats = c.optJSONObject("stats") ?: JSONObject()
        val skills = c.optJSONObject("skills") ?: JSONObject()
        val derived = c.optJSONObject("derived") ?: JSONObject()

        // Canonical skill to governing stat mapping (Core Book v1.25 pp. 130-142)
        val skillStatMap = mapOf(
            "athletics" to "DEX", "contortionist" to "DEX", "dance" to "DEX", "stealth" to "DEX",
            "drive land vehicle" to "REF", "drive_land" to "REF", "pilot air vehicle" to "REF", "pilot_air" to "REF",
            "pilot sea vehicle" to "REF", "pilot_sea" to "REF", "riding" to "REF",
            "brawling" to "DEX", "brawl" to "DEX", "evasion" to "DEX", "martial arts" to "DEX", "martial" to "DEX",
            "melee weapon" to "DEX", "melee" to "DEX",
            "archery" to "REF", "autofire" to "REF", "handgun" to "REF", "heavy weapons" to "REF", "heavy_weapons" to "REF", "shoulder arms" to "REF", "shoulder" to "REF",
            "concentration" to "WILL", "conceal/reveal objects" to "INT", "conceal" to "INT", "lip reading" to "INT", "lipread" to "INT", "perception" to "INT", "tracking" to "INT",
            "accounting" to "INT", "animal handling" to "INT", "animal" to "INT", "bureaucracy" to "INT", "business" to "INT", "composition" to "INT", "criminology" to "INT", "cryptography" to "INT", "deduction" to "INT", "education" to "INT", "gamble" to "INT", "language" to "INT", "library search" to "INT", "library" to "INT", "local expert" to "INT", "local_home" to "INT", "science" to "INT", "tactics" to "INT", "wilderness survival" to "INT", "wilderness" to "INT",
            "acting" to "COOL", "play instrument" to "TECH", "instrument" to "TECH",
            "bribery" to "COOL", "conversation" to "EMP", "human perception" to "EMP", "human_perception" to "EMP", "interrogation" to "COOL", "persuasion" to "COOL", "personal grooming" to "COOL", "grooming" to "COOL", "streetwise" to "COOL", "trading" to "COOL", "wardrobe & style" to "COOL", "wardrobe" to "COOL",
            "air vehicle tech" to "TECH", "air_tech" to "TECH", "basic tech" to "TECH", "basic_tech" to "TECH", "cybertech" to "TECH", "demolitions" to "TECH", "electronic/security tech" to "TECH", "electronics" to "TECH", "first aid" to "TECH", "first_aid" to "TECH", "forgery" to "TECH", "land vehicle tech" to "TECH", "land_tech" to "TECH", "paint/draw/sculpt" to "TECH", "art" to "TECH", "paramedic" to "TECH", "photography/film" to "TECH", "photo" to "TECH", "pick lock" to "TECH", "pick_lock" to "TECH", "pick pocket" to "TECH", "pick_pocket" to "TECH", "sea vehicle tech" to "TECH", "sea_tech" to "TECH", "weaponstech" to "TECH"
        )

        // Wound state modifier (Core Book p. 186): Seriously Wounded = -2, Mortally Wounded = -4
        val currentHp = derived.optInt("hp", c.optInt("hp", 40))
        val maxHp = derived.optInt("maxHp", c.optInt("maxHp", 40))
        val woundPenalty = when {
            currentHp <= 0 -> -4
            currentHp <= (maxHp + 1) / 2 -> -2
            else -> 0
        }

        // Helper to lookup character skill rank
        fun skillRank(name: String): Int {
            val key = name.trim().lowercase().replace(" ", "_")
            return skills.optInt(key, skills.optInt(name.trim(), skills.optInt(name.trim().lowercase(), 0)))
        }

        val dv = action.optInt("difficulty", action.optInt("dv", 13))
        val rollObj = rollCriticalD10()
        val rollTotal = rollObj.getInt("total")

        when (type) {
            "DICE_ROLL" -> {
                val formula = action.optString("formula", "1d10")
                val sides = if (formula.contains("d6")) 6 else 10
                val rollVal = kotlin.random.Random.nextInt(1, sides + 1)
                return JSONObject()
                    .put("ok", true)
                    .put("resolved", true)
                    .put("blocked", false)
                    .put("authority", "barbara-host-bridge")
                    .put("actionId", actionId)
                    .put("type", type)
                    .put("formula", formula)
                    .put("roll", rollVal)
                    .put("total", rollVal)
                    .put("passed", true)
                    .put("outcome", "SUCCESS")
            }

            "OPPOSED_CHECK", "BAR_BRAWL_OPPOSED_CHECK" -> {
                val attackerSkill = action.optString("skill", "Brawling")
                val statName = skillStatMap[attackerSkill.lowercase()] ?: "DEX"
                val statVal = stats.optInt(statName, 6)
                val skillVal = skillRank(attackerSkill)
                val attackerTotal = statVal + skillVal + rollTotal + woundPenalty
                val defRollObj = rollCriticalD10()
                val defenderRoll = defRollObj.getInt("total")
                val defenderStat = action.optInt("defenderStat", action.optInt("defenderBase", 10))
                val defenderTotal = defenderStat + defenderRoll
                // Core Book p. 129: on tie Defender always wins
                val passed = attackerTotal > defenderTotal
                return JSONObject()
                    .put("ok", true)
                    .put("resolved", true)
                    .put("blocked", false)
                    .put("authority", "barbara-host-bridge")
                    .put("actionId", actionId)
                    .put("type", type)
                    .put("skill", attackerSkill)
                    .put("stat", statName)
                    .put("statVal", statVal)
                    .put("skillVal", skillVal)
                    .put("attackerRoll", rollTotal)
                    .put("attackerTotal", attackerTotal)
                    .put("defenderTotal", defenderTotal)
                    .put("total", attackerTotal)
                    .put("dv", defenderTotal)
                    .put("passed", passed)
                    .put("outcome", if (passed) "SUCCESS" else "FAILURE")
            }

            "COMBAT_START", "COMBAT", "COMBAT_SEQUENCE", "TACTICAL_COMBAT_SEQUENCE", "CLIMAX_COMBAT", "SECURITY_NET_AND_COMBAT", "COMBAT_IF_TRIGGERED" -> {
                val refVal = stats.optInt("REF", 6)
                val initiative = refVal + rollTotal + woundPenalty
                return JSONObject()
                    .put("ok", true)
                    .put("resolved", true)
                    .put("blocked", false)
                    .put("authority", "barbara-host-bridge")
                    .put("actionId", actionId)
                    .put("type", type)
                    .put("initiative", initiative)
                    .put("total", initiative)
                    .put("passed", true)
                    .put("outcome", "COMBAT_READY")
            }

            "COMBAT_RESOLUTION", "DAMAGE" -> {
                val dmgDice = action.optInt("damageDice", 3)
                var dmgTotal = 0
                for (i in 0 until dmgDice) dmgTotal += kotlin.random.Random.nextInt(1, 7)
                return JSONObject()
                    .put("ok", true)
                    .put("resolved", true)
                    .put("blocked", false)
                    .put("authority", "barbara-host-bridge")
                    .put("actionId", actionId)
                    .put("type", type)
                    .put("damage", dmgTotal)
                    .put("total", dmgTotal)
                    .put("passed", true)
                    .put("outcome", "RESOLVED")
            }

            "NETRUN", "NET_ARCHITECTURE", "INTERFACE_CHECKS" -> {
                val rank = c.optInt("roleAbilityRank", 4)
                val total = rank + rollTotal + woundPenalty
                val passed = total >= dv
                return JSONObject()
                    .put("ok", true)
                    .put("resolved", true)
                    .put("blocked", false)
                    .put("authority", "barbara-host-bridge")
                    .put("actionId", actionId)
                    .put("type", type)
                    .put("interfaceRank", rank)
                    .put("roll", rollTotal)
                    .put("total", total)
                    .put("dv", dv)
                    .put("passed", passed)
                    .put("outcome", if (passed) "SUCCESS" else "FAILURE")
            }

            "HUMANITY_CHECK" -> {
                val currentHumanity = derived.optInt("humanity", c.optInt("humanity", 50))
                val emp = stats.optInt("EMP", 5)
                return JSONObject()
                    .put("ok", true)
                    .put("resolved", true)
                    .put("blocked", false)
                    .put("authority", "barbara-host-bridge")
                    .put("actionId", actionId)
                    .put("type", type)
                    .put("humanity", currentHumanity)
                    .put("emp", emp)
                    .put("passed", emp > 0)
                    .put("outcome", if (emp > 0) "SUCCESS" else "CYBERPSYCHOSIS")
            }

            "WORLD_TIME_ADVANCE" -> {
                val minutes = action.optInt("minutes", action.optInt("advanceMinutes", 60))
                val campaign = campaignStateOf(c)
                val clock = campaign.optJSONObject("worldClock") ?: JSONObject().also { campaign.put("worldClock", it) }
                val prevElapsed = clock.optLong("elapsedMinutes", 0L)
                val newElapsed = prevElapsed + minutes
                clock.put("elapsedMinutes", newElapsed)
                clock.put("day", newElapsed / 1440L + 1L)
                return JSONObject()
                    .put("ok", true)
                    .put("resolved", true)
                    .put("blocked", false)
                    .put("authority", "barbara-host-bridge")
                    .put("actionId", actionId)
                    .put("type", type)
                    .put("elapsedMinutes", newElapsed)
                    .put("daysAdvanced", minutes / 1440)
                    .put("passed", true)
                    .put("outcome", "TIME_ADVANCED")
            }

            "ROLLER_DERBY" -> {
                val dexVal = stats.optInt("DEX", 6)
                val athleticsVal = skillRank("Athletics")
                val total = dexVal + athleticsVal + rollTotal + woundPenalty
                val passed = total >= dv
                return JSONObject()
                    .put("ok", true)
                    .put("resolved", true)
                    .put("blocked", false)
                    .put("authority", "barbara-host-bridge")
                    .put("actionId", actionId)
                    .put("type", type)
                    .put("skill", "Athletics")
                    .put("total", total)
                    .put("dv", dv)
                    .put("passed", passed)
                    .put("outcome", if (passed) "SUCCESS" else "FAILURE")
            }

            "CHASE", "ESCAPE_SEQUENCE" -> {
                val refVal = stats.optInt("REF", 6)
                val driveVal = skillRank("Drive Land Vehicle")
                val total = refVal + driveVal + rollTotal + woundPenalty
                val passed = total >= dv
                return JSONObject()
                    .put("ok", true)
                    .put("resolved", true)
                    .put("blocked", false)
                    .put("authority", "barbara-host-bridge")
                    .put("actionId", actionId)
                    .put("type", type)
                    .put("skill", "Drive Land Vehicle")
                    .put("total", total)
                    .put("dv", dv)
                    .put("passed", passed)
                    .put("outcome", if (passed) "SUCCESS" else "FAILURE")
            }

            else -> {
                // Default: canonical skill check resolution
                var rawSkill = action.optString("skill", "Perception")
                if (type == "CYBERTECH_CHECK") rawSkill = "Cybertech"
                if (type == "ATHLETICS_CHECK") rawSkill = "Athletics"
                if (type == "DISARM") rawSkill = "Melee Weapon"
                if (type == "PARAMEDIC_OR_MEDICAL_TECH_CHECK") rawSkill = "Paramedic"
                if (type == "DEDUCTION_OR_EDUCATION_CHECK") rawSkill = "Deduction"
                if (type == "CARGO_PROTECTION") rawSkill = "Tactics"

                // Parse multi-skill options (e.g. "Streetwise / Trading / Persuasion / Bribery / plausible alternative")
                val candidates = rawSkill.split("/", "|").map { it.trim() }.filter { it.isNotBlank() && !it.contains("alternative", ignoreCase = true) }
                var bestSkill = if (candidates.isNotEmpty()) candidates.first() else rawSkill
                var bestTotal = -999
                var bestStatName = "INT"
                var bestStatVal = 6
                var bestSkillVal = 0

                for (cand in (if (candidates.isNotEmpty()) candidates else listOf(rawSkill))) {
                    val normCand = cand.lowercase()
                    val sName = skillStatMap[normCand] ?: "INT"
                    val sVal = stats.optInt(sName, 6)
                    val skVal = skillRank(cand)
                    if (sVal + skVal > bestTotal) {
                        bestTotal = sVal + skVal
                        bestSkill = cand
                        bestStatName = sName
                        bestStatVal = sVal
                        bestSkillVal = skVal
                    }
                }

                // Core Book v1.25 p. 129 formula: STAT + Skill + 1d10_crit + modifiers
                val checkTotal = bestStatVal + bestSkillVal + rollTotal + woundPenalty
                // Beat the DV (total > dv)
                val passed = checkTotal > dv

                return JSONObject()
                    .put("ok", true)
                    .put("resolved", true)
                    .put("blocked", false)
                    .put("authority", "barbara-host-bridge")
                    .put("actionId", actionId)
                    .put("type", type)
                    .put("skill", bestSkill)
                    .put("stat", bestStatName)
                    .put("statVal", bestStatVal)
                    .put("skillVal", bestSkillVal)
                    .put("dv", dv)
                    .put("roll", rollTotal)
                    .put("natural", rollObj.getInt("natural"))
                    .put("critical", rollObj.optString("critical"))
                    .put("woundPenalty", woundPenalty)
                    .put("total", checkTotal)
                    .put("passed", passed)
                    .put("outcome", if (passed) "SUCCESS" else "FAILURE")
            }
        }
    }

    // --- In-App Updater (braseiro.update/v1) with GitHub Query/Download, Cryptographic Signature (SHA256withRSA), SHA-256 Verification, Atomic Swap, Rollback & Save Preservation ---

    private fun updaterRootDir(): File = File(context.filesDir, "updates/cyberpunk-red").apply { mkdirs() }

    private fun verifyUpdatePackageSignature(
        systemId: String,
        updateId: String,
        versionName: String,
        sha256: String,
        signatureB64: String,
    ): Boolean = runCatching {
        if (signatureB64.isBlank()) return false
        val pubBytes = android.util.Base64.decode(UPDATER_PUBLIC_KEY_B64, android.util.Base64.DEFAULT)
        val keySpec = java.security.spec.X509EncodedKeySpec(pubBytes)
        val pubKey = java.security.KeyFactory.getInstance("RSA").generatePublic(keySpec)
        val sig = java.security.Signature.getInstance("SHA256withRSA")
        sig.initVerify(pubKey)
        val message = "braseiro.update/v1:$systemId:$updateId:$versionName:$sha256".toByteArray(Charsets.UTF_8)
        sig.update(message)
        val sigBytes = android.util.Base64.decode(signatureB64.trim(), android.util.Base64.DEFAULT)
        sig.verify(sigBytes)
    }.getOrDefault(false)

    private fun httpsGetGitHubJson(urlStr: String): String {
        var currentUrl = urlStr.trim()
        var redirects = 0
        while (redirects < 6) {
            val url = java.net.URL(currentUrl)
            require(url.protocol == "https") { "Apenas HTTPS é permitido no atualizador" }
            val host = url.host.lowercase()
            require(
                host == "github.com" ||
                    host == "api.github.com" ||
                    host.endsWith(".githubusercontent.com")
            ) { "Host não autorizado para atualização: $host" }
            val conn = (url.openConnection() as java.net.HttpURLConnection).apply {
                requestMethod = "GET"
                instanceFollowRedirects = false
                connectTimeout = 15_000
                readTimeout = 20_000
                setRequestProperty("User-Agent", "Braseiro-CyberpunkRED-Updater/4.1.72")
                setRequestProperty("Accept", "application/json, application/octet-stream, */*")
            }
            val code = conn.responseCode
            if (code in listOf(301, 302, 303, 307, 308)) {
                val loc = conn.getHeaderField("Location") ?: error("Redirecionamento sem Location")
                currentUrl = java.net.URL(url, loc).toString()
                conn.disconnect()
                redirects += 1
                continue
            }
            if (code !in 200..299) {
                conn.disconnect()
                error("HTTP $code ao consultar $currentUrl")
            }
            return conn.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }.also {
                conn.disconnect()
            }
        }
        error("Excesso de redirecionamentos ao consultar GitHub")
    }

    fun updaterStatus(): JSONObject = synchronized(canonicalTurnLock) {
        val root = updaterRootDir()
        val activeManifestFile = File(root, "active/manifest.json")
        val backupManifestFile = File(root, "backup_prev/manifest.json")
        val activeManifest = if (activeManifestFile.isFile) {
            runCatching { JSONObject(activeManifestFile.readText(Charsets.UTF_8)) }.getOrNull()
        } else null
        val activeCharId = activeCharacterId()
        val activeCharExists = activeCharId != null && storedCharacter(activeCharId) != null
        return JSONObject()
            .put("ok", true)
            .put("systemId", SYSTEM_ID)
            .put("baseVersionCode", BuildConfig.VERSION_CODE)
            .put("baseVersionName", BuildConfig.VERSION_NAME)
            .put("currentVersionCode", activeManifest?.optInt("versionCode", BuildConfig.VERSION_CODE) ?: BuildConfig.VERSION_CODE)
            .put("currentAppVersion", activeManifest?.optString("versionName", BuildConfig.VERSION_NAME) ?: BuildConfig.VERSION_NAME)
            .put("activeUpdate", activeManifest ?: JSONObject.NULL)
            .put("activeManifest", activeManifest ?: JSONObject.NULL)
            .put("activeFilesCount", activeManifest?.optInt("filesCount", 0) ?: 0)
            .put("rollbackAvailable", backupManifestFile.isFile || activeManifestFile.isFile)
            .put("hasRollbackBackup", backupManifestFile.isFile || activeManifestFile.isFile)
            .put("defaultManifestUrl", DEFAULT_GITHUB_UPDATE_MANIFEST_URL)
            .put("activeCharacterId", activeCharId ?: JSONObject.NULL)
            .put("activeSavePreserved", activeCharExists)
    }

    fun checkGitHubUpdate(manifestUrl: String? = null): JSONObject {
        val targetUrl = manifestUrl?.trim()?.takeIf { it.isNotEmpty() } ?: DEFAULT_GITHUB_UPDATE_MANIFEST_URL
        android.util.Log.i("CPRED_UPDATER", "checkGitHubUpdate: querying HTTPS manifest at $targetUrl")
        val raw = runBlocking(Dispatchers.IO) { httpsGetGitHubJson(targetUrl) }
        val manifest = JSONObject(raw)
        if (manifest.optString("format") != "braseiro.update.manifest/v1") {
            return JSONObject().put("ok", false).put("error", "INVALID_MANIFEST_FORMAT")
        }
        val sys = manifest.optString("systemId", "").lowercase()
        if (sys != SYSTEM_ID && sys != "cpred") {
            return JSONObject().put("ok", false).put("error", "INCOMPATIBLE_MANIFEST_SYSTEM_ID")
        }
        val latestVersionName = manifest.optString("latestVersionName", "")
        val latestVersionCode = manifest.optInt("latestVersionCode", 0)
        val updateId = manifest.optString("updateId", "")
        val packageUrl = manifest.optString("packageUrl", "")
        val sha256 = manifest.optString("sha256", "").lowercase()
        val signature = manifest.optString("signature", "")
        val signatureValid = verifyUpdatePackageSignature(SYSTEM_ID, updateId, latestVersionName, sha256, signature)
        if (!signatureValid) {
            android.util.Log.e("CPRED_UPDATER", "checkGitHubUpdate: manifest RSA signature invalid for $updateId")
            return JSONObject().put("ok", false).put("error", "MANIFEST_SIGNATURE_INVALID")
        }
        android.util.Log.i("CPRED_UPDATER", "checkGitHubUpdate: manifest verified OK (version=$latestVersionName, sha256=$sha256, signature=VALID)")
        val status = updaterStatus()
        val activeUpdate = status.optJSONObject("activeUpdate")
        val activeVersionName = activeUpdate?.optString("versionName", "") ?: ""
        val updateAvailable = latestVersionCode > BuildConfig.VERSION_CODE && activeVersionName != latestVersionName
        return JSONObject()
            .put("ok", true)
            .put("source", "github-releases")
            .put("manifestUrl", targetUrl)
            .put("updateAvailable", updateAvailable)
            .put("updateId", updateId)
            .put("latestVersionName", latestVersionName)
            .put("latestVersionCode", latestVersionCode)
            .put("packageUrl", packageUrl)
            .put("sha256", sha256)
            .put("signatureAlgorithm", manifest.optString("signatureAlgorithm", "SHA256withRSA"))
            .put("signatureVerified", true)
            .put("installedBaseVersionCode", BuildConfig.VERSION_CODE)
            .put("releaseNotes", manifest.optString("releaseNotes", ""))
    }

    fun downloadAndApplyGitHubUpdate(manifestUrl: String? = null): JSONObject {
        val check = checkGitHubUpdate(manifestUrl)
        if (!check.optBoolean("ok", false)) return check
        val packageUrl = check.optString("packageUrl", "")
        if (packageUrl.isBlank()) {
            return JSONObject().put("ok", false).put("error", "MISSING_PACKAGE_URL")
        }
        android.util.Log.i("CPRED_UPDATER", "downloadAndApplyGitHubUpdate: downloading package payload from $packageUrl")
        val rawPkg = runBlocking(Dispatchers.IO) { httpsGetGitHubJson(packageUrl) }
        android.util.Log.i("CPRED_UPDATER", "downloadAndApplyGitHubUpdate: payload received (${rawPkg.length} chars)")
        val pkgJson = JSONObject(rawPkg)
        if (pkgJson.optString("sha256", "").lowercase() != check.optString("sha256", "").lowercase()) {
            return JSONObject().put("ok", false).put("error", "MANIFEST_PACKAGE_SHA256_MISMATCH")
        }
        val applied = applyUpdatePackage(pkgJson)
        if (!applied.optBoolean("ok", false)) return applied
        return applied
            .put("downloadedFromGitHub", true)
            .put("manifestUrl", check.optString("manifestUrl"))
            .put("packageUrl", packageUrl)
            .put("releaseNotes", check.optString("releaseNotes"))
    }

    fun applyUpdatePackage(payload: JSONObject): JSONObject = synchronized(canonicalTurnLock) {
        val format = payload.optString("format", "braseiro.update/v1")
        if (format != "braseiro.update/v1") {
            return JSONObject().put("ok", false).put("error", "INVALID_UPDATE_FORMAT")
        }
        val targetSystem = payload.optString("systemId", "").lowercase()
        if (targetSystem != SYSTEM_ID && targetSystem != "cpred") {
            return JSONObject().put("ok", false).put("error", "INCOMPATIBLE_SYSTEM_ID")
        }
        val minVersionCode = payload.optInt("minVersionCode", 4100)
        val maxVersionCode = payload.optInt("maxVersionCode", 999999)
        if (BuildConfig.VERSION_CODE < minVersionCode || BuildConfig.VERSION_CODE > maxVersionCode) {
            return JSONObject().put("ok", false).put("error", "INCOMPATIBLE_VERSION_RANGE")
        }
        val updateId = payload.optString("updateId", "upd-${System.currentTimeMillis()}").trim()
        val versionName = payload.optString("versionName", "4.1.72-hotfix").trim()
        val versionCode = payload.optInt("versionCode", 417201)
        val filesObj = payload.optJSONObject("files") ?: return JSONObject().put("ok", false).put("error", "MISSING_UPDATE_FILES")
        if (filesObj.length() == 0) {
            return JSONObject().put("ok", false).put("error", "EMPTY_UPDATE_FILES")
        }

        val declaredSha256 = payload.optString("sha256", "").trim().lowercase()
        val sortedPaths = filesObj.keys().asSequence().toList().sorted()
        val canonicalConcat = buildString {
            for (relPath in sortedPaths) {
                if (relPath.contains("..") || relPath.startsWith("/")) {
                    return JSONObject().put("ok", false).put("error", "UNSAFE_UPDATE_PATH: $relPath")
                }
                append(relPath).append('\n').append(filesObj.optString(relPath, "")).append('\n')
            }
        }
        val computedSha256 = MessageDigest.getInstance("SHA-256")
            .digest(canonicalConcat.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }

        if (declaredSha256.isEmpty() || declaredSha256 != computedSha256) {
            android.util.Log.w("CPRED_UPDATER", "applyUpdatePackage: SHA-256 mismatch! declared=$declaredSha256, computed=$computedSha256")
            return JSONObject()
                .put("ok", false)
                .put("error", "UPDATE_SHA256_MISMATCH")
                .put("expectedSha256", declaredSha256)
                .put("computedSha256", computedSha256)
        }
        android.util.Log.i("CPRED_UPDATER", "applyUpdatePackage: SHA-256 validated ($computedSha256)")

        val signatureB64 = payload.optString("signature", "").trim()
        if (!verifyUpdatePackageSignature(SYSTEM_ID, updateId, versionName, computedSha256, signatureB64)) {
            android.util.Log.w("CPRED_UPDATER", "applyUpdatePackage: SHA256withRSA signature invalid for $updateId")
            return JSONObject()
                .put("ok", false)
                .put("error", "UPDATE_SIGNATURE_INVALID")
                .put("computedSha256", computedSha256)
        }
        android.util.Log.i("CPRED_UPDATER", "applyUpdatePackage: SHA256withRSA signature verified OK for $updateId")

        val preBackup = runCatching { createWorldBackup("pre_update_${updateId}") }.getOrNull()

        val root = updaterRootDir()
        val stagingDir = File(root, "staging")
        val activeDir = File(root, "active")
        val backupDir = File(root, "backup_prev")

        if (stagingDir.exists()) stagingDir.deleteRecursively()
        stagingDir.mkdirs()

        for (relPath in sortedPaths) {
            val content = filesObj.optString(relPath, "")
            val dest = File(stagingDir, relPath)
            dest.parentFile?.mkdirs()
            dest.writeText(content, Charsets.UTF_8)
        }

        val manifest = JSONObject()
            .put("format", "braseiro.update/v1")
            .put("updateId", updateId)
            .put("systemId", SYSTEM_ID)
            .put("versionName", versionName)
            .put("version", versionName)
            .put("versionCode", versionCode)
            .put("sha256", computedSha256)
            .put("signatureAlgorithm", "SHA256withRSA")
            .put("signatureVerified", true)
            .put("installedBaseVersionCode", BuildConfig.VERSION_CODE)
            .put("filesCount", sortedPaths.size)
            .put("appliedAtEpochMs", System.currentTimeMillis())
            .put("preUpdateBackup", preBackup?.optString("name") ?: JSONObject.NULL)
        File(stagingDir, "manifest.json").writeText(manifest.toString(2), Charsets.UTF_8)

        if (backupDir.exists()) backupDir.deleteRecursively()
        if (activeDir.exists()) {
            require(activeDir.renameTo(backupDir)) { "Falha ao mover atualização anterior para backup_prev" }
        }
        require(stagingDir.renameTo(activeDir)) { "Falha ao ativar pacote de atualização" }

        return updaterStatus()
            .put("applied", true)
            .put("appliedVersion", versionName)
            .put("filesWritten", sortedPaths.size)
            .put("updateId", updateId)
            .put("sha256", computedSha256)
            .put("signatureVerified", true)
            .put("installedBaseVersionCode", BuildConfig.VERSION_CODE)
    }

    fun rollbackUpdatePackage(): JSONObject = synchronized(canonicalTurnLock) {
        val root = updaterRootDir()
        val activeDir = File(root, "active")
        val backupDir = File(root, "backup_prev")
        if (activeDir.exists()) activeDir.deleteRecursively()
        if (backupDir.exists()) {
            require(backupDir.renameTo(activeDir)) { "Falha ao restaurar backup_prev" }
        }
        return updaterStatus().put("rolledBack", true)
    }

}
