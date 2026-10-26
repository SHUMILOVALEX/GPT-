import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {modules,books} from '../course.js';
import {freshState,validateState,moduleProgress,quizScore,dueCards,scheduleReview} from '../state.js';

test('12 недель имеют теорию, практику, реальные варианты ответа и источники',()=>{
 assert.deepEqual(modules.map(m=>m.id),Array.from({length:12},(_,i)=>i+1));
 for(const m of modules){
  assert.equal(m.tasks.length,3);assert.equal(m.cards.length,5);assert.equal(m.quiz.length,2);
  assert.ok(m.theory.length>=4);assert.ok(m.table.length>=5);
  for(const t of m.tasks){assert.ok(t.prompt.length>50);assert.ok(t.rubric.length>=3);assert.ok(t.sample.length>50);}
  for(const q of m.quiz){assert.ok(q.correct>=0&&q.correct<q.options.length);assert.ok(q.why.length>20);}
  for(const s of m.sources)assert.ok(books[s]);
 }
});
test('прогресс требует теорию, все работы и полностью верный тест',()=>{
 const s=freshState(),m=modules[0];assert.equal(moduleProgress(s,m),0);
 s.read[1]=true;s.checked['1-0']=true;s.checked['1-1']=true;s.checked['1-2']=true;
 s.quiz[1]=[0,0];assert.equal(moduleProgress(s,m),80);assert.equal(quizScore(s,m),0);
 s.quiz[1]=m.quiz.map(q=>q.correct);assert.equal(moduleProgress(s,m),100);
});
test('расписание не показывает будущие карточки и возвращает их после срока',()=>{
 const s=freshState(),now=1000000000;
 assert.equal(dueCards(s,now).length,60);
 s.reviews['1-0']=scheduleReview(undefined,'again',now);
 assert.equal(dueCards(s,now).length,59);assert.equal(dueCards(s,now,1).length,4);
 assert.equal(dueCards(s,now+600000,1).length,5);
 const good=scheduleReview({interval:7,count:3},'good',now);
 assert.equal(good.interval,14);assert.equal(good.count,4);
 assert.equal(scheduleReview({interval:300,count:0},'easy',now).interval,365);
 assert.throws(()=>scheduleReview(null,'invalid'));
});
test('импорт сохраняет работы и отбрасывает неизвестные или повреждённые поля',()=>{
 const s=freshState();s.answers['1-0']='<script>not executable</script>';s.checked['1-0']=true;
 s.quiz[1]=[1,2];s.reviews['1-0']=scheduleReview(undefined,'good',10000);
 assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);
 s.answers.unknown='no';s.quiz[2]=[999,0];s.reviews['1-1']={due:-1,interval:4,count:0};
 const clean=validateState(s);assert.equal(clean.answers.unknown,undefined);assert.equal(clean.quiz[2],undefined);assert.equal(clean.reviews['1-1'],undefined);
 assert.throws(()=>validateState({version:2}));
});
test('SQL выполняется на настоящей БД с ожидаемыми результатами',()=>{
 const result=execFileSync('python3',['tools/sql_lab.py'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
 assert.equal((result.match(/PASS/g)||[]).length,4);
});
