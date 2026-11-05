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
        <p style="margin-bottom:20px;color:var(--text-muted);">آزمون خود را بر اساس مبحث مورد نظر تنظیم کنید.</p>
        <a href="exam.html?course=${courseId}" class="btn-primary" style="display:inline-block;width:auto;padding:14px 40px;">ورود به آزمون</a>
      </div>`;
  } else if (tab === 'bank') {
    content.innerHTML = `
      <div style="margin-bottom:20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
        <label style="font-weight:600;color:var(--primary);">فیلتر منبع:</label>
        <select id="sourceFilter" onchange="renderBank('${courseId}')" style="padding:10px 16px;border:1px solid var(--border);border-radius:10px;font-family:inherit;font-size:0.9rem;">
          <option value="all">همه سوالات</option>
          <option value="authored_questions">تألیفی</option>
          <option value="past_questions">ادوار گذشته</option>
        </select>
        <span id="bankCount" style="color:var(--text-muted);font-size:0.85rem;"></span>
      </div>
      <div id="bankList"></div>`;
    renderBank(courseId);
  }
}

function renderBank(courseId) {
  const filter = document.getElementById('sourceFilter').value;
  const qs = getAllQuestions().filter(q =>
    q.courseId === courseId && (filter === 'all' || q.sourceType === filter));
  const list = document.getElementById('bankList');
  const countEl = document.getElementById('bankCount');
  countEl.textContent = `${qs.length} سوال`;

  if (qs.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);">سوالی با این فیلتر یافت نشد.</p>';
    return;
  }
  list.innerHTML = qs.map((q, i) => `
    <div class="question-card" style="margin-bottom:16px;">
      <p style="font-size:0.8rem;color:var(--secondary);margin-bottom:8px;">
        ${q.sourceType === 'authored_questions' ? '✍️ تألیفی' : '📋 ادوار گذشته'} | سطح: ${q.difficulty || '—'}
      </p>
      <p style="font-weight:600;margin-bottom:12px;">${i + 1}. ${q.stem}</p>
      <ul style="list-style:none;padding:0;">
        ${q.options.map(o => `
          <li style="padding:8px 14px;margin-bottom:6px;border-radius:8px;
            ${q.correctOptionIds.includes(o.id)
              ? 'background:var(--success-bg);color:var(--success);font-weight:600;'
              : 'background:var(--bg);'}">
            ${o.text}
          </li>
        `).join('')}
      </ul>
      <div class="explanation" style="margin-top:12px;font-size:0.9rem;">
        <strong>توضیح:</strong> ${q.explanation}
      </div>
    </div>
  `).join('');
}

function showSummary(courseId, topicId) {
  const s = getSummary(courseId, topicId);
  const content = document.getElementById('tabContent');
  if (!s) {
    content.innerHTML = '<p style="color:var(--text-muted);">خلاصه‌ای برای این مبحث ثبت نشده است.</p>';
    return;
  }

  let mindMapHtml = '';
  if (s.mindMap) {
    mindMapHtml = `<div class="mindmap">
      <div class="root">🧠 ${s.mindMap.root}</div>
      ${s.mindMap.branches.map(b => `
        <div class="branch">
          <div class="branch-name">▸ ${b.name}</div>
          ${b.children.map(c => `<div class="leaf">• ${c}</div>`).join('')}
        </div>
      `).join('')}
    </div>`;
  }

  content.innerHTML = `
    <button class="btn-secondary" onclick="renderTab('summaries','${courseId}')" style="margin-bottom:16px;">← بازگشت به لیست</button>
    <div class="summary-content">
      <h2>${s.title}</h2>
      <pre>${s.content}</pre>
      ${mindMapHtml}
    </div>`;
}
