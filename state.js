import { modules } from './course.js';
export const storageKey = 'analyst-path-v1';
export const freshState = () => ({version:1,answers:{},checked:{},read:{},quiz:{},reviews:{}});
export const cardKey = (moduleId,index) => `${moduleId}-${index}`;
export function validateState(value) {
  if (!value || value.version !== 1 || typeof value !== 'object') throw new Error('Неподдерживаемый формат прогресса');
  const clean = freshState();
  for (const m of modules) {
    if (value.read?.[m.id] === true) clean.read[m.id] = true;
    m.tasks.forEach((_,i) => {
      const key = cardKey(m.id,i);
      if (typeof value.answers?.[key] === 'string') {
        if (value.answers[key].length > 100000) throw new Error('Слишком длинный ответ');
        clean.answers[key] = value.answers[key];
      }
      if (value.checked?.[key] === true) clean.checked[key] = true;
    });
    const q = value.quiz?.[m.id];
    if (Array.isArray(q) && q.length === m.quiz.length && q.every((v,i) => Number.isInteger(v) && v >= 0 && v < m.quiz[i].options.length)) clean.quiz[m.id] = q;
    m.cards.forEach((_,i) => {
      const key = cardKey(m.id,i), r = value.reviews?.[key];
      if (r && Number.isFinite(r.due) && r.due >= 0 && r.due <= 8640000000000000 && Number.isFinite(r.interval) && r.interval >= 0 && r.interval <= 365 && Number.isInteger(r.count) && r.count >= 0 && r.count < 1000000) clean.reviews[key] = {due:r.due,interval:r.interval,count:r.count};
    });
  }
  return clean;
}
export function quizScore(state,m) { return (state.quiz[m.id] || []).filter((v,i) => v === m.quiz[i].correct).length; }
export function moduleProgress(state,m) {
  const done = Number(!!state.read[m.id]) + m.tasks.reduce((sum,_,i)=>sum+Number(!!state.checked[cardKey(m.id,i)]),0) + Number(quizScore(state,m) === m.quiz.length);
  return Math.round(done / (m.tasks.length+2) * 100);
}
export function allCards() {return modules.flatMap(m=>m.cards.map(([front,back],i)=>({key:cardKey(m.id,i),moduleId:m.id,title:m.short,front,back})));}
export function dueCards(state,now=Date.now(),moduleId=null) {return allCards().filter(c=>(!moduleId || c.moduleId===moduleId) && (!state.reviews[c.key] || state.reviews[c.key].due<=now)).sort((a,b)=>(state.reviews[a.key]?.due||0)-(state.reviews[b.key]?.due||0));}
export function scheduleReview(previous,rating,now=Date.now()) {
  if (!['again','hard','good','easy'].includes(rating)) throw new Error('Неизвестная оценка');
  const old = previous?.interval || 0;
  const interval = rating==='again' ? 10/1440 : rating==='hard' ? Math.max(1,old*1.2) : rating==='good' ? Math.max(3,old*2) : Math.max(7,old*3);
  const bounded = Math.min(365,interval);
  return {due:now+bounded*86400000,interval:bounded,count:(previous?.count||0)+1};
}
