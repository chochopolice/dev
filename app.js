import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebaseコンソールから取得した設定
const firebaseConfig = {
  apiKey: "AIzaSyAcvtyuPSiX4vrx_BvfbTWAl6urQyoz2F4",
  authDomain: "taskview-3bb4f.firebaseapp.com",
  projectId: "taskview-3bb4f",
  storageBucket: "taskview-3bb4f.firebasestorage.app",
  messagingSenderId: "287565583168",
  appId: "1:287565583168:web:f3b1bf84a32279274ba0a5",
  measurementId: "G-DCDDBM6G94"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const taskId = document.getElementById("taskId");
const title = document.getElementById("title");
const description = document.getElementById("description");
const assignee = document.getElementById("assignee");
const dueDate = document.getElementById("dueDate");
const status = document.getElementById("status");
const memo = document.getElementById("memo");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

let tasks = [];

saveBtn.addEventListener("click", saveTask);
clearBtn.addEventListener("click", clearForm);
searchInput.addEventListener("input", renderTasks);
statusFilter.addEventListener("change", renderTasks);

async function saveTask() {
  if (!title.value.trim()) {
    alert("タスク名を入力してください。");
    return;
  }

  const data = {
    title: title.value.trim(),
    description: description.value.trim(),
    assignee: assignee.value.trim(),
    dueDate: dueDate.value,
    status: status.value,
    memo: memo.value.trim(),
    updatedAt: serverTimestamp()
  };

  if (taskId.value) {
    await updateDoc(doc(db, "tasks", taskId.value), data);
  } else {
    await addDoc(collection(db, "tasks"), {
      ...data,
      createdAt: serverTimestamp()
    });
  }

  clearForm();
  await loadTasks();
}

async function loadTasks() {
  try {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    tasks = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error("createdAt順の読み込みに失敗したため、通常取得に切り替えます。", error);

    const fallbackSnapshot = await getDocs(collection(db, "tasks"));
    tasks = fallbackSnapshot.docs
      .map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
  }

  renderTasks();
}

function renderTasks() {
  const keyword = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  const filteredTasks = tasks.filter(task => {
    const text = `
      ${task.title || ""}
      ${task.description || ""}
      ${task.assignee || ""}
      ${task.memo || ""}
    `.toLowerCase();

    const matchKeyword = !keyword || text.includes(keyword);
    const matchStatus = !selectedStatus || task.status === selectedStatus;

    return matchKeyword && matchStatus;
  });

  taskList.innerHTML = "";

  if (filteredTasks.length === 0) {
    taskList.innerHTML = "<p>該当するタスクがありません。</p>";
    return;
  }

  filteredTasks.forEach(task => {
    const div = document.createElement("div");
    div.className = "task-item";

    div.innerHTML = `
      <div class="task-header">
        <h3>${escapeHtml(task.title || "")}</h3>
        <span class="status ${getStatusClass(task.status)}">${escapeHtml(task.status || "")}</span>
      </div>
      <p><strong>内容：</strong>${escapeHtml(task.description || "")}</p>
      <p><strong>担当者：</strong>${escapeHtml(task.assignee || "")}</p>
      <p><strong>期限日：</strong>${escapeHtml(task.dueDate || "")}</p>
      <p><strong>メモ：</strong>${escapeHtml(task.memo || "")}</p>
      <div class="actions">
        <button onclick="editTask('${task.id}')">編集</button>
        <button onclick="removeTask('${task.id}')">削除</button>
      </div>
    `;

    taskList.appendChild(div);
  });
}

window.editTask = function(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  taskId.value = task.id;
  title.value = task.title || "";
  description.value = task.description || "";
  assignee.value = task.assignee || "";
  dueDate.value = task.dueDate || "";
  status.value = task.status || "未対応";
  memo.value = task.memo || "";

  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.removeTask = async function(id) {
  if (!confirm("このタスクを削除しますか？")) return;

  await deleteDoc(doc(db, "tasks", id));
  await loadTasks();
};

function clearForm() {
  taskId.value = "";
  title.value = "";
  description.value = "";
  assignee.value = "";
  dueDate.value = "";
  status.value = "未対応";
  memo.value = "";
}

function getStatusClass(taskStatus) {
  switch (taskStatus) {
    case "完了":
      return "status-completed";
    case "対応中":
      return "status-inprogress";
    case "未対応":
      return "status-pending";
    default:
      return "";
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[s]));
}

loadTasks();
