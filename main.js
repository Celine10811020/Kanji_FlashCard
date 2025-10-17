// === 狀態 ===
const state = {
  data: [],              // 全部資料
  lessons: [],           // 可選課次
  currentLevel: null,    // 當前 Level：'A1' | 'A2'
  currentLesson: null,   // 當前課次
  indices: [],           // 當前課次的索引（未移除），作為抽卡池
  currentIdx: null,      // 目前抽到的索引（在 filtered 的索引）
  known: new Set(),      // 已記住的 filtered 索引
  flipped: false,        // 是否翻面
  backField: null        // 背面顯示欄位："Chinese" 或 "Hiragana"
};

const el = {
  level: document.getElementById('level'),
  lesson: document.getElementById('lesson'),
  cardWrap: document.getElementById('cardWrap'),
  card: document.getElementById('card'),
  front: document.getElementById('front'),
  back: document.getElementById('back'),
  backLabel: document.getElementById('backLabel'),
  count: document.getElementById('count'),
  known: document.getElementById('known'),
  empty: document.getElementById('empty'),
  btnRemember: document.getElementById('btnRemember'),
  btnNext: document.getElementById('btnNext'),
  status: document.getElementById('status')
};

// === 工具 ===
function uniqueSortedLessons(rows){
  const s = new Set();
  rows.forEach(r=>{ if(r.Lesson!==undefined && r.Lesson!==null && r.Lesson!=='') s.add(r.Lesson); });
  const list = Array.from(s);
  const nums = list.every(v=> /^\d+$/.test(String(v)) );
  if(nums) return list.map(Number).sort((a,b)=>a-b);
  return list.sort((a,b)=> (''+a).localeCompare(''+b, 'zh-Hant-u-nu-hanidec') );
}

function updateMeta(){
  const total = state.indices.length;
  const remaining = total - state.known.size;
  el.count.textContent = `${remaining} / ${total}`;
  el.known.textContent = `已記住：${state.known.size}`;
}

function setCard(jp, backText, backField){
  el.front.textContent = jp || '—';
  // 若該欄位為空，背面顯示空白（非破折號）
  el.back.textContent = (backText == null ? '' : String(backText));
  el.backLabel.textContent = backField === 'Hiragana' ? '片假名（背面）' : backField === 'Chinese' ? '中文（背面）' : '—';
}

function currentRow(){
  if(!state.filtered || state.currentIdx==null) return null;
  return state.filtered[state.currentIdx];
}

function showFront(){
  state.flipped = false;
  state.backField = null;
  el.card.classList.remove('flipped');
  const row = currentRow();
  if(!row){ setCard('—','',null); return; }
  setCard(row.HanZi, '', null);
  updateMeta();
}

function showBack(field){
  const row = currentRow();
  if(!row) return;
  state.backField = field;
  state.flipped = true;
  setCard(row.HanZi, row[field] ?? '', field);
  el.card.classList.add('flipped');
}

function pickRandom(){
  // 從尚未被記住的 pool 中「有放回」抽樣：
  const pool = state.indices.filter((_,i)=> !state.known.has(i));
  if(pool.length===0){ return false; }
  // pool 內元素是 filtered 的索引 i
  const rand = Math.floor(Math.random()*pool.length);
  const chosenFilteredIdx = pool[rand];
  state.currentIdx = chosenFilteredIdx;
  return true;
}

function nextCard(){
  if(!state.indices.length) return;
  if(!pickRandom()){
    el.cardWrap.classList.add('hidden');
    el.empty.innerHTML = `本課已全部記住 🎉<br/>請從上方選單改選其他 Lesson。`;
    el.empty.classList.remove('hidden');
    return;
  }
  showFront();
}

function rememberCard(){
  if(state.currentIdx==null) return;
  // 把目前卡片標示為已記住：從抽樣 pool 中排除
  state.known.add(state.currentIdx);

  // 如果都記住就結束，否則抽下一張
  const allKnown = state.indices.every((_,i)=> state.known.has(i));
  if(allKnown){
    el.cardWrap.classList.add('hidden');
    el.empty.innerHTML = `本課已全部記住 🎉<br/>請從上方選單改選其他 Lesson。`;
    el.empty.classList.remove('hidden');
  } else {
    nextCard();
  }
  updateMeta();
}

function buildLessonDeck(){
  const lesson = state.currentLesson;
  state.filtered = state.data.filter(r => String(r.Lesson) === String(lesson));
  state.indices = Array.from({length: state.filtered.length}, (_,i)=>i);
  state.known.clear();
  state.flipped=false; state.backField=null; state.currentIdx=null;

  if(state.indices.length){
    el.empty.classList.add('hidden');
    el.cardWrap.classList.remove('hidden');
    nextCard();
  } else {
    el.cardWrap.classList.add('hidden');
    el.empty.textContent = '此課沒有資料。';
    el.empty.classList.remove('hidden');
  }
  updateMeta();
}

function populateLessonOptions(){
  el.lesson.innerHTML = '';
  const opt0 = document.createElement('option');
  opt0.value = ''; opt0.textContent = '選擇 Lesson…';
  el.lesson.appendChild(opt0);
  state.lessons.forEach(ls => {
    const o = document.createElement('option');
    o.value = ls; o.textContent = `Lesson ${ls}`;
    el.lesson.appendChild(o);
  });
  el.lesson.disabled = false;
}

// === 載入某個 Level 的 Excel ===
const LEVEL_FILES = {
  N4: 'N4.xlsx',
  N5: 'N5.xlsx',
};

async function loadLevel(level){
  try{
    const file = LEVEL_FILES[level];
    const resp = await fetch(file);
    if(!resp.ok) throw new Error(`找不到 ${file}（請確認與 HTML 同資料夾，且透過 http 伺服器存取）。`);
    const ab = await resp.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(ab), {type:'array'});
    const first = wb.Sheets[wb.SheetNames[0]];
    let rows = XLSX.utils.sheet_to_json(first, {defval:""});

    // 正規化欄位名稱（允許大小寫差異）
    const mapKey = (obj, from, to)=>{
      const k = Object.keys(obj).find(x=> x.trim().toLowerCase()===from.toLowerCase());
      if(k && k!==to){ obj[to]=obj[k]; delete obj[k]; }
    };
    rows = rows.map(r=>{
      const o = {...r};
      mapKey(o,'Lesson','Lesson');
      mapKey(o,'HanZi','HanZi');
      mapKey(o,'Chinese','Chinese');
      mapKey(o,'Hiragana','Hiragana');
      return { Lesson: o.Lesson, HanZi: o.HanZi, Chinese: o.Chinese, Hiragana: o.Hiragana };
    }).filter(r=> r.HanZi || r.Chinese || r.Hiragana);

    // 更新狀態
    state.currentLevel = level;
    state.data = rows;
    state.lessons = uniqueSortedLessons(rows);
    state.currentLesson = null;
    populateLessonOptions();

    // UI
    el.empty.textContent = '請從上方選單選擇 Lesson 開始練習。';
    el.cardWrap.classList.add('hidden');

    // 若想預設選到最小的 Lesson，可解除以下兩行註解
    // if (state.lessons.length) { el.lesson.value = state.lessons[0]; state.currentLesson = el.lesson.value; buildLessonDeck(); }

  }catch(err){
    console.error(err);
    el.empty.innerHTML = '自動載入失敗：'+ err.message + '<br/>若以檔案:// 開啟，瀏覽器可能擋讀取，請用本機伺服器（如 VSCode Live Server）或部署到靜態主機。';
  }
}

// === 事件 ===
el.level.addEventListener('change', ()=>{
  const lv = el.level.value;
  loadLevel(lv);
});

el.lesson.addEventListener('change', ()=>{
  const v = el.lesson.value;
  if(!v){
    el.cardWrap.classList.add('hidden');
    el.empty.classList.remove('hidden');
    return;
  }
  state.currentLesson = v;
  buildLessonDeck();
});

// 卡片點擊：正面時左=漢字、右=中文；背面任意處回正面（不畫中線）
el.card.addEventListener('click', (e)=>{
  if(!state.indices.length) return;
  const rect = el.card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  if(state.flipped){
    showFront();
  }else{
    if(x < rect.width/2){
      showBack('Chinese');
    }else{
      showBack('Hiragana');
    }
  }
});

el.btnNext.addEventListener('click', ()=> nextCard());
el.btnRemember.addEventListener('click', ()=> rememberCard());

// 鍵盤快速鍵：左右切換背面、空白鍵下一張、Enter 已記住
window.addEventListener('keydown', (e)=>{
  if(!state.indices.length) return;
  if(e.key==='ArrowLeft'){
    if(state.flipped) showFront(); else showBack('Chinese');
  } else if(e.key==='ArrowRight'){
    if(state.flipped) showFront(); else showBack('Hiragana');
  } else if(e.key===' ') { e.preventDefault(); nextCard(); }
  else if(e.key==='Enter'){ rememberCard(); }
});

// 啟動（預設 A2）
loadLevel('N5');
