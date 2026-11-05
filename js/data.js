let TOPICS = [];
let QUESTIONS_PAST = [];
let QUESTIONS_AUTHORED = [];
let SUMMARIES = [];

async function loadData() {
  try {
    const [topicsRes, pastRes, authRes, sumRes] = await Promise.all([
      fetch('data/topics.json'),
      fetch('data/questions_past.json'),
      fetch('data/questions_authored.json'),
      fetch('data/summaries.json')
    ]);
    if (!topicsRes.ok || !pastRes.ok || !authRes.ok || !sumRes.ok) {
      throw new Error('خطا در دریافت فایل‌های داده');
    }
    TOPICS = (await topicsRes.json()).courses;
    QUESTIONS_PAST = (await pastRes.json()).questions;
    QUESTIONS_AUTHORED = (await authRes.json()).questions;
    SUMMARIES = (await sumRes.json()).summaries;
    return true;
  } catch (err) {
    console.error('خطا در بارگذاری داده‌ها:', err);
    return false;
  }
}

function getAllQuestions() {
  return [...QUESTIONS_PAST, ...QUESTIONS_AUTHORED];
}

function getCourse(id) {
  return TOPICS.find(c => c.id === id);
}

function getTopic(courseId, topicId) {
  const course = getCourse(courseId);
  return course ? course.topics.find(t => t.id === topicId) : null;
}

function getQuestionsByTopic(courseId, topicId, sourceType = 'all') {
  let qs = getAllQuestions().filter(q => q.courseId === courseId && q.topicId === topicId);
  if (sourceType !== 'all') qs = qs.filter(q => q.sourceType === sourceType);
  return qs;
}

function getSummary(courseId, topicId) {
  return SUMMARIES.find(s => s.courseId === courseId && s.topicId === topicId);
}
