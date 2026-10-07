// Strom podle skutečného stromu o 19 rozváděčích. Vrací funkci, která ho postaví ve formuláři.
module.exports = async function postav(p, extra) {
  return p.evaluate(async (extra) => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    aktTyp='elektro'; aktPodtyp='prumysl'; novaZprava('elektro');
    await new Promise(r=>setTimeout(r,300));
    document.getElementById('f_misto').value = 'Budova M2-Výroba v areálu firmy Vzor';
    const T = [
      ['RH1','Rozvodna budovy M2-Výroba',null,'3x1-AYY 3x1x500 + 2x1-AYY 1x500 ZeL - přívod z trafa T2'],
      ['RM 701','Rozvodna 701 - 1NP','RH1'],
      ['RM 702','Rozvodna M2: 702 2NP','RM 701'],
      ['R 01-3','Chodby pod schody M2 - u trezoru','RM 702'],
      ['R 01-4','Dílna M2 - 1NP','RM 702'],
      ['R 702.2.2','Budova M2 - Stříbro 1NP','RM 702'],
      ['RH2','Rozvodna budovy M2-Výroba',null,'3x1-AYY 3x1x500 + 2x1-AYY 1x500 ZeL - přívod z trafa T1'],
      ['RS114','Rozvodna M2: 701 - 1NP','RH2'],
      ['RS114.1','Chodba M2 - 1NP','RS114'],
      ['RS 114.2','Schodiště 1NP','RS114'],
      ['RS114.2.1','Schodiště - 2NP','RS 114.2'],
      ['RS 114.2.2','Schodiště 3NP','RS 114.2'],
      ['RS 114.3','3NP - mísntost č. 3.01','RS114'],
      ['RS 114.4','Jídelna M2 - 1NP','RS114'],
      ['RM-SK1','Místnost č. 1.16a - 1NP','RS 114.4'],
      ['RS 114.6','Expedice - m.č. 1.23','RS114'],
      ['RS3','Na stěně ve výrobním prostoru výroby','RS114'],
      ['EME','Schodiště M2 - 2.NP','RH2'],
      ['RS11','Hlavní rozvodna budovy M2','RH2']
    ].concat(extra || []);
    const karty=()=>document.querySelectorAll('#rozvadece-container [data-rozvadec-id]');
    while(karty().length<T.length) addRozvadec();
    const podle={};
    T.forEach((t,i)=>{ const k=karty()[i]; k.querySelector('.rozv-nazev').value=t[0];
      const um=k.querySelector('.rozv-umisteni'); if(um) um.value=t[1];
      const pr=k.querySelector('.rozv-privod'); if(pr&&t[3]) pr.value=t[3];
      podle[t[0]]=k; });
    const pouzito={};
    T.forEach((t,i)=>{ if(!t[2]) return; const rod=podle[t[2]]; const tb=rod.querySelector('.meas-table tbody');
      let obv=tb.querySelectorAll('tr[data-rowtype="obvod"]'); const n=pouzito[t[2]]||0;
      while(obv.length<=n){ addMereniRowTo(tb); obv=tb.querySelectorAll('tr[data-rowtype="obvod"]'); }
      const tr=obv[n]; pouzito[t[2]]=n+1; const inp=tr.querySelectorAll('input');
      inp[0].value='FA'+(n+3); inp[1].value='vývod '+t[0]; inp[3].value='C'; inp[4].value='3x25'; inp[15].value='CYKY-J 5×10';
      napajiZapsat(tr,[karty()[i].dataset.rozvUid],[]); });
    renderRozvStrom();
    await new Promise(r=>setTimeout(r,200));
    return karty().length;
  }, extra);
};
