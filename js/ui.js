// ========== صفحه اصلی: رندر دوره‌ها ==========
async function renderCourses() {
  const grid = document.getElementById('coursesGrid');
  const ok = await loadData();
  if (!ok) {
    grid.innerHTML = '<div class="error-msg">خطا در بارگذاری داده‌ها. لطفاً صفحه را دوباره بارگذاری کنید.</div>';
    return;
  }
  grid.innerHTML = TOPICS.map(course => `
    <div class="card" onclick="location.href='course.html?course=${course.id}'">
      <span class="card-icon">${course.icon === 'brain' ? '🧠' : '🩸'}</span>
      <h3>${course.title}</h3>
      <p>${course.description}</p>
      <p style="margin-top:16px;color:var(--secondary);font-weight:600;font-size:0.85rem;">${course.topics.length} مبحث</p>
    </div>
  `).join('');
}

// ========== صفحه دوره ==========
async function initCoursePage() {
  const ok = await loadData();
  if (!ok) {
    document.getElementById('courseHeader').innerHTML = '<div class="error-msg">خطا در بارگذاری داده‌ها.</div>';
    return;
  }
  const params = new URLSearchParams(location.search);
  const courseId = params.get('course') || 'neuropathology';
  const course = getCourse(courseId);
  if (!course) {
    document.getElementById('courseHeader').innerHTML = '<p>دوره یافت نشد.</p>';
    return;
  }

  document.getElementById('courseHeader').innerHTML = `
    <h2 class="page-title">${course.title}</h2>
    <p style="color:var(--text-muted);margin-bottom:24px;">${course.description}</p>
  `;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTab(btn.dataset.tab, courseId);
    });
  });

  renderTab('summaries', courseId);
}

function renderTab(tab, courseId) {
  const content = document.getElementById('tabContent');
  const course = getCourse(courseId);
  if (!course) return;

  if (tab === 'summaries') {
    content.innerHTML = `<ul class="topic-list">${course.topics.map(t => {
      const s = getSummary(courseId, t.id);
      return `<li class="topic-item" onclick="showSummary('${courseId}','${t.id}')">
        <span>📖 ${t.title}</span>
        <span>${s ? '✅ خلاصه موجود' : '—'}</span>
      </li>`;
    }).join('')}</ul>`;
  } else if (tab === 'exam') {
    content.innerHTML = `
      <div class="form-card" style="text-align:center;">
        <p style="margin-bottom:20px;color:var(--text-muted);">آزمون خود را بر اساس مبحث و منبع مورد نظر تنظیم کنید.</p>
        <a href="exam.html?course=${courseId}" class="btn-primary" style="display:inline-block;width:auto;padding:14px 40px;">ورود به آزمون</a>
      </div>`;
  } else if (tab === 'authored') {
    content.innerHTML = `
      <div class="bank-info">
        📌 در این بخش فقط <strong>سوالات تألیفی</strong> (طراحی‌شده توسط تیم MedEx) نمایش داده می‌شود.
      </div>
      <div id="bankList"></div>`;
    renderBank(courseId, 'authored_questions');
  } else if (tab === 'past') {
    content.innerHTML = `
      <div class="bank-info">
        📌 در این بخش فقط <strong>سوالات ادوار گذشته</strong> (آزمون‌های میان‌ترم و پایان‌ترم) نمایش داده می‌شود.
      </div>
      <div id="bankList"></div>`;
    renderBank(courseId, 'past_questions');
  }
}

function renderBank(courseId, sourceType) {
  const qs = getAllQuestions().filter(q => q.courseId === courseId && q.sourceType === sourceType);
  const list = document.getElementById('bankList');
  if (qs.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);padding:20px;">سوالی در این بخش ثبت نشده است.</p>';
    return;
  }

  list.innerHTML = qs.map((q, i) => {
    const tags = `
      <span class="bank-tag ${sourceType === 'authored_questions' ? 'authored' : 'past'}">
        ${sourceType === 'authored_questions' ? '✍️ تألیفی' : '📋 ادوار گذشته'}
      </span>
      <span class="bank-tag difficulty">سطح: ${q.difficulty || '—'}</span>
    `;
    return `<div class="bank-item">
      <div class="bank-meta">${tags}</div>
      <p class="bank-stem">${i + 1}. ${q.stem}</p>
      ${q.options.map(o => {
        const isCorrect = q.correctOptionIds.includes(o.id);
        return `<div class="bank-option ${isCorrect ? 'correct' : ''}">
          ${isCorrect ? '✅ ' : ''}${o.text}
        </div>`;
      }).join('')}
      <div class="bank-explanation">
        <strong>توضیح پاسخ:</strong> ${q.explanation}
      </div>
    </div>`;
  }).join('');
}

// ========== نمایش خلاصه (تمیز و ساختاریافته) ==========
function showSummary(courseId, topicId) {
  const s = getSummary(courseId, topicId);
  const content = document.getElementById('tabContent');
  if (!s) {
    content.innerHTML = '<p style="color:var(--text-muted);">خلاصه‌ای برای این مبحث ثبت نشده است.</p>';
    return;
  }

  // تبدیل متن خام به سکشن‌های ساختاریافته
  const htmlContent = parseSummaryContent(s.content);

  // ساخت مایندمپ
  let mindMapHtml = '';
  if (s.mindMap) {
    mindMapHtml = `
      <div class="mindmap-wrap">
        <h3>🗺️ نقشه مفهومی</h3>
        <div class="mindmap-root">${s.mindMap.root}</div>
        <div class="mindmap-branches">
          ${s.mindMap.branches.map(b => `
            <div class="mindmap-branch">
              <div class="mindmap-branch-title">${b.name}</div>
              ${b.children.map(c => `<div class="mindmap-leaf">${c}</div>`).join('')}
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  content.innerHTML = `
    <button class="btn-secondary" onclick="renderTab('summaries','${courseId}')" style="margin-bottom:16px;">← بازگشت به لیست</button>
    <div class="summary-page">
      <div class="summary-header">
        <h2>📚 ${s.title}</h2>
        <p>منبع: ${s.sourceFile || '—'}</p>
      </div>
      ${htmlContent}
      ${mindMapHtml}
    </div>`;
}

// تابع تبدیل متن خام به ساختار تمیز
function parseSummaryContent(text) {
  if (!text) return '';

  const lines = text.split('\n');
  let html = '';
  let currentSection = null;
  let inList = false;

  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
  const closeSection = () => { if (currentSection) { closeList(); html += '</div>'; currentSection = null; } };

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // تیتر سطح ۲ (##)
    if (line.startsWith('## ')) {
      closeSection();
      html += `<div class="summary-section"><h3>${line.replace('## ', '')}</h3>`;
      currentSection = true;
      continue;
    }

    // تیتر سطح ۳ (###)
    if (line.startsWith('### ')) {
      closeList();
      html += `<h4 style="color:var(--secondary);margin:12px 0 8px;">${line.replace('### ', '')}</h4>`;
      continue;
    }

    // آیتم لیست
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) { html += '<ul>'; inList = true; }
      let item = line.substring(2);
      // بولد کردن با **...**
      item = item.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // کد درون خطی با `...`
      item = item.replace(/`(.+?)`/g, '<code>$1</code>');
      html += `<li>${item}</li>`;
      continue;
    }

    // خطوط عادی
    closeList();
    let para = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html += `<p style="margin:8px 0;font-size:0.95rem;">${para}</p>`;
  }

  closeSection();
  closeList();
  return html;
}
