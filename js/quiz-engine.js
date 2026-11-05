let examState = {
  questions: [],
  answers: {},
  currentIndex: 0,
  mode: 'educational',
  startTime: null,
  courseId: null,
  timerInterval: null
};

async function initExamPage() {
  const ok = await loadData();
  if (!ok) {
    document.getElementById('examSetup').innerHTML = '<div class="error-msg">خطا در بارگذاری داده‌ها.</div>';
    return;
  }
  const params = new URLSearchParams(location.search);
  examState.courseId = params.get('course') || 'neuropathology';
  const course = getCourse(examState.courseId);
  if (!course) return;

  const select = document.getElementById('topicSelect');
  select.innerHTML = `<option value="all">همه مباحث</option>` +
    course.topics.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
}

function startExam() {
  const topicId = document.getElementById('topicSelect').value;
  const mode = document.getElementById('modeSelect').value;
  const count = parseInt(document.getElementById('countInput').value);
  const errEl = document.getElementById('examError');

  let pool;
  if (topicId === 'all') {
    pool = getAllQuestions().filter(q => q.courseId === examState.courseId);
  } else {
    pool = getQuestionsByTopic(examState.courseId, topicId);
  }

  if (pool.length === 0) {
    errEl.textContent = 'سوالی برای این مبحث یافت نشد.';
    errEl.hidden = false;
    return;
  }
  if (isNaN(count) || count < 1) {
    errEl.textContent = 'تعداد سوال نامعتبر است.';
    errEl.hidden = false;
    return;
  }
  if (count > pool.length) {
    errEl.textContent = `تعداد سوال درخواستی (${count}) بیشتر از موجود (${pool.length}) است.`;
    errEl.hidden = false;
    return;
  }
  errEl.hidden = true;

  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
  examState.questions = shuffled;
  examState.answers = {};
  examState.currentIndex = 0;
  examState.mode = mode;
  examState.startTime = Date.now();

  document.getElementById('examSetup').hidden = true;
  document.getElementById('examRoom').hidden = false;
  document.getElementById('examResult').hidden = true;

  // تایمر
  if (examState.timerInterval) clearInterval(examState.timerInterval);
  examState.timerInterval = setInterval(updateTimer, 1000);
  updateTimer();

  renderQuestion();
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - examState.startTime) / 1000);
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  const el = document.getElementById('examTimer');
  if (el) el.textContent = `⏱ ${m}:${s}`;
}

function renderQuestion() {
  const q = examState.questions[examState.currentIndex];
  const total = examState.questions.length;
  document.getElementById('examProgress').textContent = `سوال ${examState.currentIndex + 1} از ${total}`;

  const selected = examState.answers[q.id];
  let optionsHtml = q.options.map(o => {
    let cls = 'option';
    if (examState.mode === 'educational' && selected) {
      if (q.correctOptionIds.includes(o.id)) cls += ' correct';
      else if (selected === o.id) cls += ' wrong';
    } else if (selected === o.id) {
      cls += ' selected';
    }
    return `<div class="${cls}" onclick="selectOption('${q.id}','${o.id}')">${o.text}</div>`;
  }).join('');

  let explanationHtml = '';
  if (examState.mode === 'educational' && selected) {
    explanationHtml = `<div class="explanation"><strong>توضیح پاسخ:</strong> ${q.explanation}</div>`;
  }

  document.getElementById('questionCard').innerHTML = `
    <p class="question-stem">${q.stem}</p>
    ${optionsHtml}
    ${explanationHtml}
  `;

  // دکمه‌های ناوبری
  const prevBtn = document.querySelector('.exam-nav .btn-secondary');
  const nextBtn = document.querySelector('.exam-nav .btn-primary');
  if (prevBtn) prevBtn.disabled = examState.currentIndex === 0;
  if (nextBtn) nextBtn.textContent = examState.currentIndex === total - 1 ? 'آخرین سوال' : 'بعدی ←';
}

function selectOption(qId, optId) {
  if (examState.mode === 'educational' && examState.answers[qId]) return;
  examState.answers[qId] = optId;
  renderQuestion();
}

function prevQuestion() {
  if (examState.currentIndex > 0) {
    examState.currentIndex--;
    renderQuestion();
  }
}

function nextQuestion() {
  if (examState.currentIndex < examState.questions.length - 1) {
    examState.currentIndex++;
    renderQuestion();
  }
}

function finishExam() {
  if (examState.timerInterval) clearInterval(examState.timerInterval);

  const total = examState.questions.length;
  let correct = 0, wrong = 0, skipped = 0;

  examState.questions.forEach(q => {
    const ans = examState.answers[q.id];
    if (!ans) skipped++;
    else if (q.correctOptionIds.includes(ans)) correct++;
    else wrong++;
  });

  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const elapsed = Math.floor((Date.now() - examState.startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;

  document.getElementById('examRoom').hidden = true;
  document.getElementById('examResult').hidden = false;

  document.getElementById('resultSummary').innerHTML = `
    <div class="result-summary">
      <div class="result-score">${percent}%</div>
      <p>${correct} پاسخ صحیح از ${total} سوال</p>
      <div class="stats">
        <span class="stat-item" style="color:var(--success);">✅ صحیح: ${correct}</span>
        <span class="stat-item" style="color:var(--danger);">❌ نادرست: ${wrong}</span>
        <span class="stat-item" style="color:var(--warning);">⏭ بدون پاسخ: ${skipped}</span>
        <span class="stat-item">⏱ زمان: ${m} دقیقه و ${s} ثانیه</span>
      </div>
    </div>`;

  document.getElementById('resultReview').innerHTML = examState.questions.map((q, i) => {
    const ans = examState.answers[q.id];
    let status = 'skip', statusText = 'بدون پاسخ';
    if (ans) {
      if (q.correctOptionIds.includes(ans)) { status = 'correct'; statusText = 'صحیح'; }
      else { status = 'wrong'; statusText = 'نادرست'; }
    }
    return `<div class="question-card">
      <p style="margin-bottom:8px;">
        <strong>${i + 1}.</strong> ${q.stem}
        <span class="badge badge-${status}">${statusText}</span>
      </p>
      <ul style="list-style:none;padding:0;margin:10px 0;">
        ${q.options.map(o => {
          let style = 'padding:8px 14px;margin-bottom:6px;border-radius:8px;background:var(--bg);';
          if (q.correctOptionIds.includes(o.id)) style = 'padding:8px 14px;margin-bottom:6px;border-radius:8px;background:var(--success-bg);color:var(--success);font-weight:600;';
          else if (ans === o.id) style = 'padding:8px 14px;margin-bottom:6px;border-radius:8px;background:var(--danger-bg);color:var(--danger);';
          return `<li style="${style}">${o.text}</li>`;
        }).join('')}
      </ul>
      <div class="explanation">${q.explanation}</div>
    </div>`;
  }).join('');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
