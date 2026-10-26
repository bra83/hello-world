package com.braseiro.cyberpunkred.dice;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Contrato puro entre a física de dados e a interpretação do host.
 *
 * A expressão pode combinar termos de dados, por exemplo 2d6+1d8+5. A física
 * informa somente as faces que realmente ficaram para cima; este objeto remonta
 * os resultados lógicos e o total a partir delas. Nenhum total vindo do renderer
 * tem autoridade sobre a rolagem.
 */
public final class DiceRollSpec {
    private static final Pattern TOKEN=Pattern.compile("([+-]?)(?:(\\d*)d(\\d+)|(\\d+))",Pattern.CASE_INSENSITIVE);
    public static final class Term {
        public final int count,sides,sign;
        Term(int count,int sides,int sign){this.count=count;this.sides=sides;this.sign=sign<0?-1:1;}
    }

    /** Compatibilidade: count é o total de dados lógicos; sides só é não-zero para uma fórmula de um único tipo. */
    public final int count,sides,modifier;
    public final String formula,mode;
    public final List<Term> terms;

    private DiceRollSpec(List<Term> parsed,int modifier,String formula,String mode){
        this.terms=Collections.unmodifiableList(new ArrayList<Term>(parsed));
        int total=0;for(Term t:parsed)total+=t.count;this.count=total;
        this.sides=parsed.size()==1?parsed.get(0).sides:0;
        this.modifier=modifier;this.formula=formula;this.mode=mode;
    }

    public static DiceRollSpec parse(String raw,String requestedMode){
        String f=(raw==null?"":raw).toLowerCase(Locale.US).replace('\u2212','-').replace('\u2013','-').replace('\u2014','-').replaceAll("\\s+","");
        if(f.length()==0)throw new IllegalArgumentException("Informe uma fórmula, por exemplo d20+5 ou 2d6+1d8+3.");
        ArrayList<Term> terms=new ArrayList<Term>();int modifier=0,pos=0,totalDice=0;
        Matcher m=TOKEN.matcher(f);
        while(m.find()){
            if(m.start()!=pos)throw new IllegalArgumentException("Fórmula inválida perto de '"+f.substring(pos)+"'. Use dados e modificadores, por exemplo 2d6+1d8+3.");
            int sign="-".equals(m.group(1))?-1:1;
            if(m.group(3)!=null){
                int c=m.group(2)==null||m.group(2).length()==0?1:parseInt(m.group(2),"quantidade de dados");
                int s=parseInt(m.group(3),"faces do dado");
                if(c<1||c>100||s<2||s>1000)throw new IllegalArgumentException("Quantidade ou dado fora do limite.");
                totalDice+=c;if(totalDice>100)throw new IllegalArgumentException("A fórmula excede 100 dados lógicos.");
                terms.add(new Term(c,s,sign));
            }else{
                int value=parseInt(m.group(4),"modificador");
                long next=(long)modifier+(long)sign*value;if(next<Integer.MIN_VALUE||next>Integer.MAX_VALUE)throw new IllegalArgumentException("Modificador fora do limite.");
                modifier=(int)next;
            }
            pos=m.end();
        }
        if(pos!=f.length()||terms.isEmpty())throw new IllegalArgumentException("Use pelo menos um dado, por exemplo d20+5 ou 2d6+1d8+3.");
        String normalized=normalizeMode(requestedMode);
        // Compatibilidade herdada; Cyberpunk RED usa modo Normal e delega toda interpretação ao Rules Engine.
        if(!(terms.size()==1&&terms.get(0).sign>0&&terms.get(0).count==1&&terms.get(0).sides==20))normalized="Normal";
        return new DiceRollSpec(terms,modifier,normalizeFormula(terms,modifier),normalized);
    }

    private static int parseInt(String s,String label){try{return Integer.parseInt(s);}catch(Exception e){throw new IllegalArgumentException("Valor inválido em "+label+".");}}
    private static String normalizeFormula(List<Term> terms,int modifier){
        StringBuilder b=new StringBuilder();boolean first=true;
        for(Term t:terms){if(!first)b.append(t.sign<0?'-':'+');else if(t.sign<0)b.append('-');if(t.count!=1)b.append(t.count);b.append('d').append(t.sides);first=false;}
        if(modifier!=0){b.append(modifier>0?'+':'-').append(Math.abs((long)modifier));}
        return b.toString();
    }

    public boolean isAdvantage(){return terms.size()==1&&terms.get(0).count==1&&terms.get(0).sides==20&&terms.get(0).sign>0&&!"Normal".equals(mode);}
    public boolean isSimple(){return terms.size()==1;}
    public int physicalBodyCount(){int n=0;for(Term t:terms)n+=t.count*(t.sides==100?2:1);return isAdvantage()?2:n;}
    public boolean supportsPhysical3d(){
        for(Term t:terms)if(!(t.sides==4||t.sides==6||t.sides==8||t.sides==10||t.sides==12||t.sides==20||t.sides==100))return false;
        return physicalBodyCount()<=20;
    }
    public Set<Integer> physicalThemeSides(){LinkedHashSet<Integer> out=new LinkedHashSet<Integer>();for(Term t:terms)out.add(t.sides);return out;}

    /** Reconstrói os resultados lógicos exclusivamente a partir das faces físicas, na ordem dos termos. */
    public List<Integer> rollsFromPhysicalFaces(List<Integer> physicalFaces){
        if(physicalFaces==null)physicalFaces=Collections.emptyList();
        ArrayList<Integer> out=new ArrayList<Integer>();int at=0;
        if(isAdvantage()){
            if(physicalFaces.size()!=2)throw new IllegalArgumentException("A rolagem física de vantagem/desvantagem exige dois d20 estabilizados.");
            for(int v:physicalFaces){check(v,20);out.add(v);}return out;
        }
        int expected=physicalBodyCount();if(physicalFaces.size()!=expected)throw new IllegalArgumentException("A física devolveu "+physicalFaces.size()+" face(s), mas eram esperadas "+expected+".");
        for(Term t:terms)for(int i=0;i<t.count;i++){
            if(t.sides==100){int tens=physicalFaces.get(at++),ones=physicalFaces.get(at++);checkZeroToNine(tens);checkZeroToNine(ones);int value=tens*10+ones;out.add(value==0?100:value);}
            else{int v=physicalFaces.get(at++);check(v,t.sides);out.add(v);}
        }
        return out;
    }

    /** Verifica que o renderer não reportou valores diferentes das faces físicas. */
    public List<Integer> requirePhysicalAgreement(List<Integer> reportedRolls,List<Integer> physicalFaces){
        List<Integer> canonical=rollsFromPhysicalFaces(physicalFaces);
        if(reportedRolls!=null&&!reportedRolls.isEmpty()){
            if(reportedRolls.size()!=canonical.size())throw new IllegalArgumentException("Resultado visual divergente da quantidade de resultados físicos.");
            for(int i=0;i<canonical.size();i++)if(reportedRolls.get(i).intValue()!=canonical.get(i).intValue())throw new IllegalArgumentException("Resultado visual divergente da face física no resultado "+(i+1)+".");
        }
        return canonical;
    }

    public Result resolvePhysical(List<Integer> physicalFaces){return resolve(rollsFromPhysicalFaces(physicalFaces));}
    public List<Integer> randomRolls(Random random){
        if(random==null)throw new IllegalArgumentException("Fonte aleatória ausente.");ArrayList<Integer> vals=new ArrayList<Integer>();
        if(isAdvantage()){vals.add(random.nextInt(20)+1);vals.add(random.nextInt(20)+1);return vals;}
        for(Term t:terms)for(int i=0;i<t.count;i++)vals.add(random.nextInt(t.sides)+1);return vals;
    }

    public Result resolve(List<Integer> faces){
        if(faces==null)faces=Collections.emptyList();ArrayList<Integer> vals=new ArrayList<Integer>(faces);
        if(isAdvantage()){
            if(vals.size()!=2)throw new IllegalArgumentException("Vantagem/desvantagem precisa de dois d20.");
            check(vals.get(0),20);check(vals.get(1),20);int chosen="Vantagem".equals(mode)?Math.max(vals.get(0),vals.get(1)):Math.min(vals.get(0),vals.get(1));
            int total=safeAdd(chosen,modifier);String detail="["+vals.get(0)+", "+vals.get(1)+"] escolhe "+chosen+modifierText();return new Result(total,chosen,detail,critical(chosen));
        }
        if(vals.size()!=count)throw new IllegalArgumentException("A rolagem devolveu "+vals.size()+" resultado(s), mas a fórmula exige "+count+".");
        long total=modifier;int at=0;StringBuilder detail=new StringBuilder();
        for(Term t:terms){ArrayList<Integer> group=new ArrayList<Integer>();long subtotal=0;for(int i=0;i<t.count;i++){int v=vals.get(at++);check(v,t.sides);group.add(v);subtotal+=v;}total+=(long)t.sign*subtotal;if(detail.length()>0)detail.append(t.sign<0?" - ":" + ");else if(t.sign<0)detail.append('-');detail.append(group);}
        if(modifier!=0)detail.append(modifier>0?" + ":" - ").append(Math.abs((long)modifier));
        if(total<Integer.MIN_VALUE||total>Integer.MAX_VALUE)throw new IllegalArgumentException("Total fora do limite inteiro.");
        int natural=isSingleD20()?vals.get(0):0;return new Result((int)total,natural,detail.toString(),critical(natural));
    }

    public String physicalDetail(List<Integer> logical,List<Integer> physicalFaces,Result resolved){
        if(resolved==null)return "";StringBuilder out=new StringBuilder();int logicalAt=0,physicalAt=0;
        if(isAdvantage()&&logical!=null&&logical.size()==2){out.append('[').append(logical.get(0)).append(" · ").append(logical.get(1)).append("] → ").append(resolved.natural);if(modifier!=0)out.append(modifier>0?" + ":" - ").append(Math.abs((long)modifier));out.append(" = ").append(resolved.total);return out.toString();}
        for(Term t:terms){if(out.length()>0)out.append(t.sign<0?" - ":" + ");else if(t.sign<0)out.append('-');
            if(t.sides==100&&physicalFaces!=null){out.append('[');for(int i=0;i<t.count;i++){if(i>0)out.append("; ");int tens=physicalFaces.get(physicalAt++)*10,ones=physicalFaces.get(physicalAt++),value=logical.get(logicalAt++);out.append(String.format(Locale.US,"%02d",tens)).append(" + ").append(ones).append(" → ").append(value);}out.append(']');}
            else{out.append('[');for(int i=0;i<t.count;i++){if(i>0)out.append(" · ");out.append(logical.get(logicalAt++));physicalAt++;}out.append(']');}
        }
        if(modifier!=0)out.append(modifier>0?" + ":" - ").append(Math.abs((long)modifier));out.append(" = ").append(resolved.total);return out.toString();
    }

    private boolean isSingleD20(){return terms.size()==1&&terms.get(0).count==1&&terms.get(0).sides==20&&terms.get(0).sign>0;}
    private int safeAdd(int a,int b){long x=(long)a+b;if(x<Integer.MIN_VALUE||x>Integer.MAX_VALUE)throw new IllegalArgumentException("Total fora do limite inteiro.");return(int)x;}
    private String modifierText(){return modifier==0?"":(modifier>0?" + ":" - ")+Math.abs((long)modifier);}
    private static void check(int v,int sides){if(v<1||v>sides)throw new IllegalArgumentException("Face física inválida: "+v+" em d"+sides+".");}
    private static void checkZeroToNine(int v){if(v<0||v>9)throw new IllegalArgumentException("Face física inválida no d10 percentile: "+v+".");}
    private static String critical(int natural){if(natural==20)return "20 natural.";if(natural==1)return "1 natural.";return "Rolagem concluída.";}
    public static String normalizeMode(String raw){String s=raw==null?"":raw.toLowerCase(Locale.US);if(s.contains("desvantagem"))return "Desvantagem";if(s.contains("vantagem"))return "Vantagem";return "Normal";}
    public static final class Result {public final int total,natural;public final String detail,critical;Result(int total,int natural,String detail,String critical){this.total=total;this.natural=natural;this.detail=detail;this.critical=critical;}}
}

