
const LEVELS = [
    {
        name: "START",
        subtitle: "Boshlang‘ich matematik",
        icon: "🌱",
        topics: ["Qo‘shish", "Ayirish", "Ko‘paytirish", "Bo‘lish"]
    },
    {
        name: "CENTER",
        subtitle: "O‘rtacha qiyinlik",
        icon: "⚡",
        topics: ["Kasrlar", "Foizlar", "Tenglamalar", "Geometriya"]
    },
    {
        name: "END",
        subtitle: "Ohirgi daraja",
        icon: "🏆",
        topics: ["Darajalar", "Ildizlar", "Algebra", "Aralash masalalar"]
    }
];

const DAYS_PER_LEVEL = 60;
const TOTAL_DAYS = 180;

const $ = id => document.getElementById(id);

let accounts = readJSON("mathway_accounts", {});
let currentUser = localStorage.getItem("mathway_current_user") || "";
let state = null;

let active = null;
let selected = null;
let checked = false;
let toastTimer;

// MA'LUMOTLARNI SAQLASH

function readJSON(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch (e) {
        return fallback;
    }
}

function saveAccounts() {
    localStorage.setItem(
        "mathway_accounts",
        JSON.stringify(accounts)
    );
}

function blankProgress() {
    return {
        completed: [],
        coins: 15,
        streak: 0,
        lastDay: "",
        inventory: {},
        lastBonusDate: "",
        lastCompletedTime: 0,
        completedDayTimes: {}
    };
}

function loadProgress() {
    if (!currentUser) return blankProgress();
    const p = readJSON(
        "mathway_progress_" + currentUser,
        blankProgress()
    );
    if (!p.completed || !Array.isArray(p.completed)) p.completed = [];
    if (!p.inventory) p.inventory = {};
    if (typeof p.coins !== "number") p.coins = 15;
    if (typeof p.streak !== "number") p.streak = 0;
    if (!p.lastBonusDate) p.lastBonusDate = "";
    if (typeof p.lastDay !== "string") p.lastDay = "";
    if (typeof p.lastCompletedTime !== "number") p.lastCompletedTime = 0;
    if (!p.completedDayTimes || typeof p.completedDayTimes !== "object") p.completedDayTimes = {};
    return p;
}

function saveProgress() {
    if (!currentUser || !state) return;
    localStorage.setItem(
        "mathway_progress_" + currentUser,
        JSON.stringify(state)
    );
}

// LOGIN VA REGISTER

let authMode = "login";

function showAuth() {

    $("authPage").classList.remove("hidden");
    $("sitePage").classList.add("hidden");

    $("authTitle").textContent =
        authMode === "login"
            ? "Xush kelibsiz!"
            : "Yangi akkaunt yaratish";

    $("authSubtitle").textContent =
        authMode === "login"
            ? "Davom etish uchun login va parolingizni kiriting."
            : "MathWay'dan foydalanish uchun login va parol tanlang.";

    $("authSubmit").textContent =
        authMode === "login"
            ? "Kirish"
            : "Ro‘yxatdan o‘tish";

    $("switchAuth").textContent =
        authMode === "login"
            ? "Akkauntingiz yo‘qmi? Ro‘yxatdan o‘tish"
            : "Akkauntingiz bormi? Kirish";

    $("authError").textContent = "";
}

$("switchAuth").addEventListener("click", () => {

    authMode =
        authMode === "login"
            ? "register"
            : "login";

    showAuth();
});

$("authForm").addEventListener("submit", e => {

    e.preventDefault();

    const username = $("username").value.trim();
    const password = $("password").value;

    if (username.length < 3 || password.length < 4) {

        $("authError").textContent =
            "Login kamida 3, parol kamida 4 belgidan iborat bo‘lsin.";

        return;
    }

    if (authMode === "register") {

        if (accounts[username]) {

            $("authError").textContent =
                "Bu login band. Boshqa login tanlang.";

            return;
        }

        accounts[username] = password;

        saveAccounts();

        currentUser = username;

        localStorage.setItem(
            "mathway_current_user",
            currentUser
        );

        state = blankProgress();

        saveProgress();

        enterSite();

    } else {

        if (
            !accounts[username] ||
            accounts[username] !== password
        ) {

            $("authError").textContent =
                "Login yoki parol noto‘g‘ri.";

            return;
        }

        currentUser = username;

        localStorage.setItem(
            "mathway_current_user",
            currentUser
        );

        enterSite();
    }
});

// SAYTGA KIRISH

function enterSite() {

    state = loadProgress();

    $("currentUser").textContent = currentUser;

    $("authPage").classList.add("hidden");
    $("sitePage").classList.remove("hidden");

    renderLevels();
    updateStats();
    renderShop();
    renderInventory();
}

// LOGOUT

$("logoutBtn").addEventListener("click", () => {

    currentUser = "";

    localStorage.removeItem("mathway_current_user");

    $("username").value = "";
    $("password").value = "";

    authMode = "login";

    showAuth();
});

// DARS VA TEST HISOBLASH

function globalDay(level, day) {
    return level * DAYS_PER_LEVEL + day;
}

function testKey(level, day, test) {
    return globalDay(level, day) * 10 + test;
}

function completedDay(level, day) {

    return [1, 2, 3].every(test =>

        state.completed.includes(
            testKey(level, day, test)
        )

    );
}

const DAY_COOLDOWN_MS = 24 * 60 * 60 * 1000; // Har bir yangi kun uchun 24 soatlik tanaffus

function formatTimeShort(ms) {
    if (ms <= 0) return "0d";
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) return `${h}s ${m}d`;
    if (m > 0) return `${m}d ${s}s`;
    return `${s}s`;
}

function formatTimeLong(ms) {
    if (ms <= 0) return "hozir ochiladi";
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const parts = [];
    if (h > 0) parts.push(`${h} soat`);
    if (m > 0) parts.push(`${m} daqiqa`);
    if (h === 0 && s > 0) parts.push(`${s} soniya`);
    return parts.join(" ") || "1 daqiqadan kam";
}

function getNextDayRemainingTime(level, day) {
    if (!state) return 0;
    const n = globalDay(level, day);
    if (n <= 1) return 0; // 1-kun har doim darhol ochiq bo'ladi

    const prevDay = n - 1;
    // Oldingi kunning 3 ta testi ham bajarilganmi?
    const prevCompleted = [1, 2, 3].every(test =>
        state.completed && state.completed.includes(prevDay * 10 + test)
    );
    if (!prevCompleted) return 0; // Hali oldingi kun tugatilmagan

    // Agar bu kunning o'zi allaqachon yakunlangan bo'lsa, kutish kerak emas (qayta ishlash mumkin)
    if (completedDay(level, day)) return 0;

    state.completedDayTimes = state.completedDayTimes || {};
    let prevDoneTime = state.completedDayTimes[prevDay];

    // Agar oldingi kun tugatilgan, lekin vaqt yozilmagan bo'lsa, joriy vaqtni yozib qo'yamiz
    if (!prevDoneTime) {
        prevDoneTime = state.lastCompletedTime || Date.now();
        state.completedDayTimes[prevDay] = prevDoneTime;
        saveProgress();
    }

    const elapsed = Date.now() - prevDoneTime;
    if (elapsed >= DAY_COOLDOWN_MS) {
        return 0; // 24 soat o'tdi, yangi kun ochildi!
    }

    return DAY_COOLDOWN_MS - elapsed;
}

function dayUnlocked(level, day) {
    if (!state) return false;
    const n = globalDay(level, day);

    // 1-kun har doim ochiq
    if (n === 1) return true;

    // Tugallangan kunlarni har doim qayta kirib ko'rish mumkin
    if (completedDay(level, day)) return true;

    const prevN = n - 1;
    const prevCompleted = [1, 2, 3].every(test =>
        state.completed && state.completed.includes(prevN * 10 + test)
    );

    // Oldingi kun tugatilmagan bo'lsa, bu kun qulflangan
    if (!prevCompleted) return false;

    // Oldingi kundan keyin 24 soat o'tgan bo'lsagina ochiladi
    const remaining = getNextDayRemainingTime(level, day);
    return remaining <= 0;
}

function testsDone(level, day) {

    return [1, 2, 3].filter(test =>

        state.completed.includes(
            testKey(level, day, test)
        )

    ).length;
}

function testUnlocked(level, day, test) {

    if (!dayUnlocked(level, day)) return false;

    if (test === 1) return true;

    return state.completed.includes(
        testKey(level, day, test - 1)
    );
}

// STATISTIKA

function totalCompletedDays() {

    let count = 0;

    for (let li = 0; li < 3; li++) {

        for (let day = 1; day <= 60; day++) {

            if (completedDay(li, day)) {
                count++;
            }
        }
    }

    return count;
}

function updateStats() {

    $("coinCount").textContent = state.coins;

    $("shopCoinCount").textContent = state.coins;

    $("streakCount").textContent = state.streak;

    $("overallText").textContent =
        `${totalCompletedDays()} / ${TOTAL_DAYS} kun`;

    $("overallBar").style.width =
        `${totalCompletedDays() / TOTAL_DAYS * 100}%`;

    updateShopCounters();
}

// LEVEL VA KUNLAR

function renderLevels() {

    const root = $("levelsContainer");

    root.innerHTML = "";

    LEVELS.forEach((level, li) => {

        let finished = 0;

        for (let day = 1; day <= 60; day++) {

            if (completedDay(li, day)) {
                finished++;
            }
        }

        const section = document.createElement("section");

        section.className = "level-section";

        const header = document.createElement("div");

        header.className = "level-header";

        header.innerHTML = `
            <div class="level-title">

                <div class="level-icon">
                    ${level.icon}
                </div>

                <div>
                    <h2>${level.name}</h2>
                    <p>${level.subtitle}</p>
                </div>

            </div>

            <span class="level-count">
                ${finished}/60 kun
            </span>
        `;

        section.appendChild(header);

        const grid = document.createElement("div");

        grid.className = "day-grid";

        for (let day = 1; day <= 60; day++) {

            const done = completedDay(li, day);
            const unlocked = dayUnlocked(li, day);
            const remaining = getNextDayRemainingTime(li, day);
            const isWaiting = !done && !unlocked && remaining > 0;
            const tests = testsDone(li, day);

            const btn = document.createElement("button");
            btn.className = "day-card";

            let icon = "🔒";
            let subtext = `${tests}/3 test`;

            if (done) {
                btn.classList.add("completed");
                icon = "✓";
                subtext = "Tugallangan";
            } else if (unlocked) {
                btn.classList.add("unlocked");
                icon = "📘";
                subtext = `${tests}/3 test`;
            } else if (isWaiting) {
                btn.classList.add("waiting");
                icon = "⏳";
                subtext = formatTimeShort(remaining);
            } else {
                btn.classList.add("locked");
            }

            btn.innerHTML = `
                <span>${icon}</span>
                <b>${day}-kun</b>
                <small>${subtext}</small>
            `;

            btn.addEventListener("click", () => {
                openNextTest(li, day);
            });

            grid.appendChild(btn);
        }

        section.appendChild(grid);

        const note = document.createElement("div");

        note.className = "reward-note";

        note.textContent =
            `🎁 Har 15 kunlik bosqich yakunida 10 coin. ${Math.floor(finished / 15)} / 4 mukofot`;

        section.appendChild(note);

        root.appendChild(section);
    });
}

// KEYINGI TESTNI OCHISH

function openNextTest(li, day) {

    if (completedDay(li, day)) {
        showToast(`${day}-kun allaqachon yakunlangan! Qayta mashq qilish uchun ochildi 👍`);
        openTest(li, day, 1);
        return;
    }

    const remaining = getNextDayRemainingTime(li, day);
    if (remaining > 0) {
        const timeStr = formatTimeLong(remaining);
        showToast(`⏳ ${day}-kun ochilishiga ${timeStr} qoldi! Yangi kunlar har 24 soatda ochiladi. ⏰`);
        return;
    }

    if (!dayUnlocked(li, day)) {
        showToast(`🔒 ${day}-kun hali qulflangan. Avval oldingi kun testlarini yakunlang!`);
        return;
    }

    const next = [1, 2, 3].find(test =>
        !state.completed.includes(
            testKey(li, day, test)
        )
    );

    if (!next) {
        openTest(li, day, 1);
        return;
    }

    openTest(li, day, next);
}

// VARIANTLARNI RANDOM ARALASHTIRISH (TO'G'RI JAVOB HAR SAFAR HAR XIL O'RINDA CHIQADI)

function shuffleChoices(answer, wrongList, seed) {
    const cleanWrong = [];
    const used = new Set([String(answer)]);

    if (Array.isArray(wrongList)) {
        for (const w of wrongList) {
            const sw = String(w);
            if (!used.has(sw)) {
                used.add(sw);
                cleanWrong.push(w);
            }
            if (cleanWrong.length === 3) break;
        }
    }

    let offset = 1;
    while (cleanWrong.length < 3) {
        let alt;
        if (typeof answer === "number") {
            const delta = Math.ceil(offset / 2);
            alt = offset % 2 === 1 ? answer + delta : Math.max(0, answer - delta);
        } else {
            alt = `${cleanWrong.length + 1}-variant`;
        }
        if (!used.has(String(alt))) {
            used.add(String(alt));
            cleanWrong.push(alt);
        }
        offset++;
    }

    const items = [answer, ...cleanWrong];

    // Seed orqali Fisher-Yates aralashtirish (har bir testda javob 1-, 2-, 3- yoki 4-o'ringa tushadi)
    let s = ((seed * 9301 + 49297) % 233280 + 233280) % 233280;
    const rnd = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };

    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
}

// SAVOLLARNI YARATISH (HAR BIR KUN VA TEST UCHUN YAGONA VA TURLI SAVOLLAR)

function makeQuestion(li, day, test) {

    // Har bir daraja, kun va test uchun takrorlanmas noyob seed
    const seed = day * 101 + li * 211 + test * 41 + 17;
    const topic = LEVELS[li].topics[Math.floor((day - 1) / 15)];
    const type = Math.floor((day - 1) / 15);

    let q = "";
    let answer = 0;
    let wrong = null;

    if (li === 0) {
        // LEVEL 0: START (BOSHLANG'ICH MATEMATIK)
        if (type === 0) {
            // QO'SHISH (1-15 kunlar)
            if (day <= 3) {
                // 1-3 kunlar: Bir xonali sonlar yig'indisi
                const n1 = ((day * 7 + test * 5) % 8) + 2;
                const n2 = ((day * 5 + test * 7) % 8) + 2;
                if (test === 3) {
                    const n3 = ((day * 3 + test) % 5) + 1;
                    q = `${n1} + ${n2} + ${n3} = ?`;
                    answer = n1 + n2 + n3;
                } else {
                    q = `${n1} + ${n2} = ?`;
                    answer = n1 + n2;
                }
            } else if (day <= 6) {
                // 4-6 kunlar: Ikki xonali va o'tishli qo'shish
                const n1 = ((day * 11 + test * 7) % 25) + 14;
                const n2 = ((day * 9 + test * 5) % 20) + 11;
                q = `${n1} + ${n2} = ?`;
                answer = n1 + n2;
            } else if (day <= 9) {
                // 7-9 kunlar: Matnli qo'shish masalalari
                const n1 = ((day * 4 + test * 6) % 18) + 10;
                const n2 = ((day * 8 + test * 4) % 14) + 8;
                const items = ["olma", "kitob", "qalam", "sharlar", "yulduzcha"][day % 5];
                q = `Ali ${n1} ta, Vali esa ${n2} ta ${items} to‘pladi. Bolalarda jami nechta ${items} bor?`;
                answer = n1 + n2;
            } else if (day <= 12) {
                // 10-12 kunlar: Yirikroq sonlar
                const n1 = ((day * 13 + test * 11) % 45) + 35;
                const n2 = ((day * 7 + test * 13) % 35) + 25;
                q = `${n1} + ${n2} = ?`;
                answer = n1 + n2;
            } else {
                // 13-15 kunlar: Tenglamali noma'lum sonni topish
                const n1 = ((day * 6 + test * 8) % 30) + 15;
                const n2 = ((day * 5 + test * 9) % 25) + 12;
                const total = n1 + n2;
                if (test % 2 === 1) {
                    q = `${n1} + ? = ${total}. So‘roq belgisi o‘rnidagi sonni toping.`;
                    answer = n2;
                } else {
                    q = `? + ${n2} = ${total}. Noma’lum qo‘shiluvchini toping.`;
                    answer = n1;
                }
            }
        } else if (type === 1) {
            // AYIRISH (16-30 kunlar)
            const subDay = day - 15;
            if (subDay <= 3) {
                const n2 = ((day * 5 + test * 3) % 8) + 3;
                const diff = ((day * 4 + test * 7) % 9) + 4;
                const n1 = n2 + diff;
                q = `${n1} − ${n2} = ?`;
                answer = diff;
            } else if (subDay <= 6) {
                const n2 = ((day * 7 + test * 4) % 25) + 15;
                const diff = ((day * 6 + test * 5) % 20) + 12;
                const n1 = n2 + diff;
                q = `${n1} − ${n2} = ?`;
                answer = diff;
            } else if (subDay <= 9) {
                const n1 = ((day * 9 + test * 5) % 35) + 45;
                const n2 = ((day * 4 + test * 3) % 20) + 12;
                const diff = n1 - n2;
                const texts = [
                    `Do‘konda ${n1} ta daftar bor edi. Kun davomida ${n2} tasi sotildi. Nechta daftar qoldi?`,
                    `Kitob ${n1} betdan iborat. Aziz ${n2} betini o‘qib bo‘ldi. Yana necha bet qoldi?`,
                    `Avtobusda ${n1} nafar yo‘lovchi bor edi. Bekatda ${n2} kishi tushdi. Nechta yo‘lovchi qoldi?`
                ];
                q = texts[(day + test) % 3];
                answer = diff;
            } else if (subDay <= 12) {
                const n2 = ((day * 8 + test * 7) % 55) + 20;
                q = `100 − ${n2} = ?`;
                answer = 100 - n2;
            } else {
                const n1 = ((day * 7 + test * 9) % 35) + 45;
                const diff = ((day * 4 + test * 5) % 20) + 15;
                const n2 = n1 - diff;
                if (test % 2 === 1) {
                    q = `${n1} − ? = ${diff}. Ayriluvchini toping.`;
                    answer = n2;
                } else {
                    q = `? − ${n2} = ${diff}. Kamayuvchini toping.`;
                    answer = n1;
                }
            }
        } else if (type === 2) {
            // KO'PAYTIRISH (31-45 kunlar)
            const mulDay = day - 30;
            if (mulDay <= 3) {
                const a = ((day * 7 + test * 5) % 8) + 2;
                const b = ((day * 4 + test * 7) % 8) + 2;
                q = `${a} × ${b} = ?`;
                answer = a * b;
            } else if (mulDay <= 6) {
                const a = ((day * 3 + test * 5) % 12) + 11;
                const b = ((day * 2 + test * 3) % 4) + 3;
                q = `${a} × ${b} = ?`;
                answer = a * b;
            } else if (mulDay <= 9) {
                const boxes = ((day * 2 + test * 3) % 5) + 4;
                const count = ((day * 3 + test * 2) % 5) + 6;
                const items = ["qutida shokolad", "savatchada olma", "paketda pechenye"][(day + test) % 3];
                q = `Har bir ${items}dan ${count} tadan bor. ${boxes} ta shunday to‘plamda jami nechta bo‘ladi?`;
                answer = boxes * count;
            } else if (mulDay <= 12) {
                const a = [15, 20, 25, 30, 40, 50, 12, 16][(day + test) % 8];
                const b = ((day * 5 + test * 2) % 3) + 2;
                q = `${a} × ${b} = ?`;
                answer = a * b;
            } else {
                const a = ((day * 4 + test * 3) % 6) + 4;
                const b = ((day * 5 + test * 4) % 7) + 3;
                const prod = a * b;
                if (test % 2 === 1) {
                    q = `${a} × ? = ${prod}. Noma’lum ko‘paytuvchini toping.`;
                    answer = b;
                } else {
                    const add = ((day * 3 + test) % 15) + 5;
                    q = `(${a} × ${b}) + ${add} = ?`;
                    answer = prod + add;
                }
            }
        } else {
            // BO'LISH (46-60 kunlar)
            const divDay = day - 45;
            if (divDay <= 3) {
                const b = ((day * 3 + test * 5) % 7) + 3;
                const ans = ((day * 5 + test * 4) % 7) + 3;
                const a = b * ans;
                q = `${a} ÷ ${b} = ?`;
                answer = ans;
            } else if (divDay <= 6) {
                const b = ((day * 2 + test * 3) % 4) + 2;
                const ans = ((day * 3 + test * 2) % 12) + 12;
                const a = b * ans;
                q = `${a} ÷ ${b} = ?`;
                answer = ans;
            } else if (divDay <= 9) {
                const persons = ((day * 3 + test * 2) % 4) + 4;
                const each = ((day * 2 + test * 4) % 6) + 5;
                const total = persons * each;
                const items = ["konfet", "daftar", "qalam", "kitob"][(day + test) % 4];
                q = `${total} ta ${items} ${persons} nafar o‘quvchiga teng taqsimlansa, har biriga nechtadan tegadi?`;
                answer = each;
            } else if (divDay <= 12) {
                const b = ((day * 4 + test * 3) % 5) + 4;
                const ans = ((day * 5 + test * 2) % 6) + 4;
                const a = b * ans;
                if (test % 2 === 1) {
                    q = `${a} ÷ ? = ${ans}. Bo‘luvchini toping.`;
                    answer = b;
                } else {
                    q = `? ÷ ${b} = ${ans}. Bo‘linuvchini toping.`;
                    answer = a;
                }
            } else {
                const b = ((day * 2 + test * 3) % 4) + 2;
                const divPart = ((day * 3 + test * 2) % 7) + 4;
                const a = b * divPart;
                const extra = ((day * 4 + test) % 15) + 10;
                if (test % 2 === 1) {
                    q = `(${a} ÷ ${b}) + ${extra} = ?`;
                    answer = divPart + extra;
                } else {
                    q = `(${a} ÷ ${b}) × 3 = ?`;
                    answer = divPart * 3;
                }
            }
        }
    } else if (li === 1) {
        // LEVEL 1: CENTER (O'RTACHA QIYINLIK)
        if (type === 0) {
            // KASRLAR (1-15 kunlar)
            if (day <= 3) {
                const den = ((day * 3 + test * 2) % 5) + 5;
                const n1 = ((day * 2 + test) % (den - 3)) + 1;
                const n2 = ((day + test * 2) % (den - n1 - 1)) + 1;
                q = `${n1}/${den} + ${n2}/${den} = ?`;
                answer = `${n1 + n2}/${den}`;
                wrong = [
                    `${n1 + n2}/${den + den}`,
                    `${Math.max(1, n1 + n2 - 1)}/${den}`,
                    `${n1 + n2 + 1}/${den}`
                ];
            } else if (day <= 6) {
                const den = ((day * 4 + test * 3) % 6) + 5;
                const n2 = ((day * 2 + test) % 3) + 1;
                const n1 = n2 + ((day + test) % 3) + 1;
                q = `${n1}/${den} − ${n2}/${den} = ?`;
                answer = `${n1 - n2}/${den}`;
                wrong = [
                    `${n1 - n2}/${den + 1}`,
                    `${n1 + n2}/${den}`,
                    `${Math.max(1, n1 - n2 + 1)}/${den}`
                ];
            } else if (day <= 9) {
                const den = ((day * 3 + test * 4) % 5) + 4;
                const num = ((day * 2 + test) % (den - 1)) + 1;
                q = `1 − ${num}/${den} = ?`;
                answer = `${den - num}/${den}`;
                wrong = [
                    `${num}/${den}`,
                    `${den - num}/${den + 1}`,
                    `${Math.max(1, den - num - 1)}/${den}`
                ];
            } else if (day <= 12) {
                const den = [3, 4, 5, 6, 8][(day + test) % 5];
                const num = ((day + test) % (den - 1)) + 1;
                const factor = ((day * 2 + test * 3) % 4) + 4;
                const val = den * factor;
                const ans = factor * num;
                q = `${val} sonining ${num}/${den} qismi qanchaga teng?`;
                answer = ans;
                wrong = [ans + factor, Math.max(1, ans - factor), ans + 2];
            } else {
                const k = ((day * 2 + test) % 3) + 2;
                const a = ((day + test) % 3) + 1;
                const b = a + ((day * 3 + test) % 3) + 1;
                const bigNum = a * k;
                const bigDen = b * k;
                q = `${bigNum}/${bigDen} kasri eng sodda ko‘rinishga keltirilsa (qisqartirilsa), qanday bo‘ladi?`;
                answer = `${a}/${b}`;
                wrong = [
                    `${a + 1}/${b}`,
                    `${a}/${b + 1}`,
                    `${bigNum - 1}/${bigDen}`
                ];
            }
        } else if (type === 1) {
            // FOIZLAR (16-30 kunlar)
            const pctDay = day - 15;
            if (pctDay <= 3) {
                const pcts = [10, 20, 25, 50, 75];
                const p = pcts[(day + test) % 5];
                const base = [100, 120, 160, 200, 240, 300, 400][(day * 2 + test) % 7];
                const ans = (base * p) / 100;
                q = `${base} ning ${p}% i nechaga teng?`;
                answer = ans;
                wrong = [ans + 10, Math.max(1, ans - 10), ans * 2];
            } else if (pctDay <= 6) {
                const p = [5, 15, 30, 40, 60][(day + test) % 5];
                const base = [60, 80, 120, 150, 180, 250][(day * 3 + test) % 6];
                const ans = (base * p) / 100;
                q = `${base} ning ${p}% i qancha bo‘ladi?`;
                answer = ans;
                wrong = [ans + 5, Math.max(2, ans - 5), ans + 12];
            } else if (pctDay <= 9) {
                const orig = [100, 150, 200, 250, 300][(day + test) % 5];
                const discount = [10, 20, 25, 30][(day * 2 + test) % 4];
                const saving = (orig * discount) / 100;
                const finalPrice = orig - saving;
                q = `Mahsulot narxi ${orig} coin edi. Unga ${discount}% chegirma berildi. Yangi narx necha coin bo‘ladi?`;
                answer = finalPrice;
                wrong = [finalPrice + saving, finalPrice - 10, orig - 10];
            } else if (pctDay <= 12) {
                const p = [20, 25, 50][(day + test) % 3];
                const part = [10, 15, 20, 25, 30, 40][(day * 2 + test) % 6];
                const full = (part * 100) / p;
                q = `Qaysi sonning ${p}% i ${part} ga teng?`;
                answer = full;
                wrong = [full + 20, Math.max(10, full - 20), full / 2];
            } else {
                const total = [20, 25, 30, 40][(day + test) % 4];
                const boyPct = [40, 50, 60, 70][(day * 2 + test) % 4];
                const girlPct = 100 - boyPct;
                const girls = (total * girlPct) / 100;
                q = `Sinfda jami ${total} nafar o‘quvchi bor. Ularning ${boyPct}% i o‘g‘il bolalar bo‘lsa, qizlar soni nechta?`;
                answer = girls;
                wrong = [girls + 2, Math.max(1, girls - 2), total - girls + 3];
            }
        } else if (type === 2) {
            // TENGLAMALAR (31-45 kunlar)
            const eqDay = day - 30;
            if (eqDay <= 3) {
                const a = ((day * 3 + test * 5) % 20) + 10;
                const ans = ((day * 4 + test * 3) % 15) + 8;
                const b = a + ans;
                q = `x + ${a} = ${b}. x nechaga teng?`;
                answer = ans;
            } else if (eqDay <= 6) {
                const a = ((day * 2 + test * 3) % 5) + 3;
                const ans = ((day * 3 + test * 4) % 8) + 4;
                const b = a * ans;
                q = `${a}x = ${b}. x ning qiymatini toping.`;
                answer = ans;
            } else if (eqDay <= 9) {
                const a = ((day * 3 + test * 2) % 3) + 2;
                const ans = ((day * 2 + test * 3) % 6) + 3;
                const b = ((day * 4 + test) % 8) + 3;
                const c = a * ans + b;
                q = `${a}x + ${b} = ${c}. x ni toping.`;
                answer = ans;
            } else if (eqDay <= 12) {
                const a = ((day * 2 + test * 3) % 3) + 2;
                const ans = ((day * 3 + test * 2) % 5) + 2;
                const b = ((day * 4 + test) % 4) + 2;
                const c = a * (ans + b);
                q = `${a}(x + ${b}) = ${c}. Tenglamani yeching: x = ?`;
                answer = ans;
            } else {
                const c = ((day * 2 + test) % 3) + 1;
                const diffA = ((day + test * 2) % 2) + 1;
                const a = c + diffA;
                const ans = ((day * 3 + test) % 5) + 2;
                const d = ((day * 2 + test * 3) % 12) + 12;
                const b = d - diffA * ans;
                q = `${a}x + ${b} = ${c}x + ${d}. x nechaga teng?`;
                answer = ans;
            }
        } else {
            // GEOMETRIYA (46-60 kunlar)
            const geoDay = day - 45;
            if (geoDay <= 3) {
                if (test % 2 === 1) {
                    const side = ((day * 3 + test * 4) % 10) + 4;
                    q = `Tomoni ${side} sm bo‘lgan kvadratning perimetri necha sm?`;
                    answer = 4 * side;
                    wrong = [side * side, 2 * side, 4 * side + 4];
                } else {
                    const a = ((day * 2 + test * 3) % 7) + 5;
                    const b = ((day * 3 + test * 2) % 5) + 3;
                    q = `Bo‘yi ${a} sm, eni ${b} sm bo‘lgan to‘g‘ri to‘rtburchakning perimetri qancha?`;
                    answer = 2 * (a + b);
                    wrong = [a * b, a + b, 2 * (a + b) + 4];
                }
            } else if (geoDay <= 6) {
                if (test % 2 === 1) {
                    const side = ((day * 2 + test * 3) % 8) + 3;
                    q = `Tomoni ${side} sm bo‘lgan kvadratning yuzi necha sm² bo‘ladi?`;
                    answer = side * side;
                    wrong = [4 * side, side * (side - 1), side * side + 10];
                } else {
                    const a = ((day * 3 + test * 2) % 8) + 4;
                    const b = ((day * 2 + test * 3) % 4) + 3;
                    q = `Bo‘yi ${a} sm, eni ${b} sm bo‘lgan to‘g‘ri to‘rtburchak yuzi qancha?`;
                    answer = a * b;
                    wrong = [2 * (a + b), a * b + 6, a * b - 4];
                }
            } else if (geoDay <= 9) {
                if (test % 2 === 1) {
                    const side = ((day * 4 + test * 2) % 8) + 5;
                    q = `Teng tomonli uchburchakning har bir tomoni ${side} sm. Uning perimetri qancha?`;
                    answer = 3 * side;
                    wrong = [side * side, 2 * side, 4 * side];
                } else {
                    const deg1 = ((day * 5 + test * 3) % 35) + 40;
                    const deg2 = ((day * 3 + test * 4) % 30) + 30;
                    const deg3 = 180 - deg1 - deg2;
                    q = `Uchburchakning ikki burchagi ${deg1}° va ${deg2}°. Uchinchi burchagi necha gradus?`;
                    answer = deg3;
                    wrong = [deg3 + 10, Math.max(15, deg3 - 10), 180 - deg1];
                }
            } else if (geoDay <= 12) {
                const a = ((day * 2 + test) % 4) + 2;
                if (test % 2 === 1) {
                    q = `Qirrasi ${a} sm bo‘lgan kubning hajmi necha sm³ ga teng?`;
                    answer = a * a * a;
                    wrong = [6 * a * a, a * a, 4 * a];
                } else {
                    q = `Qirrasi ${a} sm bo‘lgan kubning to‘la sirti yuzi necha sm²?`;
                    answer = 6 * a * a;
                    wrong = [a * a * a, 4 * a * a, 6 * a];
                }
            } else {
                const s = ((day * 3 + test * 2) % 6) + 4;
                const area = s * s;
                const p = 4 * s;
                if (test % 2 === 1) {
                    q = `Yuzi ${area} sm² bo‘lgan kvadratning perimetri necha sm?`;
                    answer = p;
                    wrong = [s, area / 2, p + 4];
                } else {
                    q = `Perimetri ${p} sm bo‘lgan kvadratning yuzi necha sm²?`;
                    answer = area;
                    wrong = [p, s * 2, area + 8];
                }
            }
        }
    } else {
        // LEVEL 2: END (OHIRGI DARAJA)
        if (type === 0) {
            // DARAJALAR (1-15 kunlar)
            if (day <= 3) {
                const x = ((day * 4 + test * 3) % 9) + 4;
                q = `${x} ning kvadrati (${x}²) nechaga teng?`;
                answer = x * x;
                wrong = [x * 2, x * x + x, Math.max(1, x * x - 10)];
            } else if (day <= 6) {
                const x = ((day * 2 + test) % 4) + 2;
                q = `${x} ning kubi (${x}³) nechaga teng?`;
                answer = x * x * x;
                wrong = [x * 3, x * x, x * x * x + x];
            } else if (day <= 9) {
                const p = ((day + test * 2) % 5) + 3;
                q = `2 ning ${p}-darajasi (2^${p}) nechaga teng?`;
                answer = Math.pow(2, p);
                wrong = [2 * p, Math.pow(2, p - 1), Math.pow(2, p) + 4];
            } else if (day <= 12) {
                const a = ((day * 2 + test) % 3) + 2;
                const b = ((day + test * 2) % 3) + 2;
                q = `${a}² + ${b}² = ?`;
                answer = a * a + b * b;
                wrong = [(a + b) * (a + b), a * a + b, a * 2 + b * 2];
            } else {
                if (test === 1) {
                    const num = ((day * 7 + 13) % 70) + 15;
                    q = `${num}⁰ (istalgan sonning 0-darajasi) nechaga teng?`;
                    answer = 1;
                    wrong = [0, num, num / 2];
                } else if (test === 2) {
                    const a = ((day * 3) % 4) + 2;
                    q = `(-${a})² = ?`;
                    answer = a * a;
                    wrong = [-(a * a), -2 * a, a * 2];
                } else {
                    const a = ((day * 2) % 3) + 2;
                    q = `(-${a})³ = ?`;
                    answer = -(a * a * a);
                    wrong = [a * a * a, -3 * a, a * 3];
                }
            }
        } else if (type === 1) {
            // ILDIZLAR (16-30 kunlar)
            const rootDay = day - 15;
            if (rootDay <= 3) {
                const x = ((day * 3 + test * 4) % 10) + 4;
                q = `√${x * x} = ?`;
                answer = x;
                wrong = [x * x, x * 2, x + 2];
            } else if (rootDay <= 6) {
                const a = ((day * 2 + test) % 5) + 3;
                const b = ((day + test * 2) % 5) + 3;
                q = `√${a * a} + √${b * b} = ?`;
                answer = a + b;
                wrong = [a * a + b * b, a * b, a + b + 2];
            } else if (rootDay <= 9) {
                const x = ((day * 2 + test) % 4) + 2;
                q = `∛${x * x * x} (kub ildiz) nechaga teng?`;
                answer = x;
                wrong = [x * x, x * 3, x + 2];
            } else if (rootDay <= 12) {
                const pyth = [
                    [3, 4, 5],
                    [6, 8, 10],
                    [5, 12, 13],
                    [9, 12, 15]
                ][(day + test) % 4];
                q = `√(${pyth[0]}² + ${pyth[1]}²) = ?`;
                answer = pyth[2];
                wrong = [pyth[0] + pyth[1], pyth[2] * pyth[2], pyth[2] + 2];
            } else {
                const a = ((day * 3 + test) % 4) + 3;
                const add = ((day * 2 + test * 2) % 6) + 4;
                q = `2√${a * a} + ${add} = ?`;
                answer = 2 * a + add;
                wrong = [a + add, 2 * (a + add), 2 * a * add];
            }
        } else if (type === 2) {
            // ALGEBRA (31-45 kunlar)
            const algDay = day - 30;
            if (algDay <= 3) {
                const c1 = ((day * 2 + test) % 4) + 2;
                const c2 = ((day + test * 2) % 4) + 2;
                q = `${c1}a + ${c2}a = ? ifodani soddalashtiring.`;
                answer = `${c1 + c2}a`;
                wrong = [`${c1 + c2}a²`, `${c1 * c2}a`, `${c1 + c2}`];
            } else if (algDay <= 6) {
                const xVal = ((day * 2 + test) % 3) + 2;
                const coeff = ((day + test * 3) % 3) + 2;
                const k = ((day * 3 + test) % 6) + 3;
                q = `Agar x = ${xVal} bo‘lsa, ${coeff}x + ${k} ning qiymati qancha?`;
                answer = coeff * xVal + k;
                wrong = [coeff * xVal, (coeff + k) * xVal, coeff * xVal + k + 3];
            } else if (algDay <= 9) {
                const a = ((day * 2 + test) % 3) + 3;
                const b = ((day + test * 2) % 2) + 1;
                q = `a = ${a} va b = ${b} bo‘lsa, a² − b² ning qiymati nechaga teng?`;
                answer = a * a - b * b;
                wrong = [(a - b) * (a - b), a * a + b * b, a - b];
            } else if (algDay <= 12) {
                const x = ((day * 3 + test) % 6) + 5;
                const y = ((day * 2 + test * 2) % 3) + 1;
                const sum = x + y;
                const diff = x - y;
                q = `x + y = ${sum} va x − y = ${diff} bo‘lsa, x nechaga teng?`;
                answer = x;
                wrong = [y, sum - diff, x + 2];
            } else {
                const root = ((day * 2 + test) % 6) + 3;
                q = `x² − ${root * root} = 0 tenglamaning musbat ildizi nechaga teng?`;
                answer = root;
                wrong = [root * root, root * 2, root + 1];
            }
        } else {
            // ARALASH MASALALAR (46-60 kunlar)
            const mixDay = day - 45;
            if (mixDay <= 3) {
                const speed = [40, 50, 60, 70, 80][(day + test) % 5];
                const time = ((day * 2 + test) % 3) + 2;
                q = `Avtomobil ${speed} km/soat tezlik bilan ${time} soat yurdi. U jami necha km masofa bosgan?`;
                answer = speed * time;
                wrong = [speed + time, speed * (time - 1), (speed * time) + 20];
            } else if (mixDay <= 6) {
                const rate = ((day * 2 + test) % 4) + 4;
                const daysCount = ((day * 3 + test) % 4) + 5;
                q = `Usta kuniga ${rate} tadan buyum yasaydi. U ${daysCount} kunda jami nechta buyum tayyorlaydi?`;
                answer = rate * daysCount;
                wrong = [rate + daysCount, (rate * daysCount) - rate, (rate * daysCount) + 10];
            } else if (mixDay <= 9) {
                const step = ((day * 2 + test) % 3) + 3;
                const start = ((day + test) % 4) + 2;
                const a1 = start;
                const a2 = a1 + step;
                const a3 = a2 + step;
                const a4 = a3 + step;
                q = `${a1}, ${a2}, ${a3}, ... ketma-ketlikni davom ettiring. Keyingi son nechaga teng?`;
                answer = a4;
                wrong = [a4 + 1, a4 - 1, a3 + 1];
            } else if (mixDay <= 12) {
                const shirts = ((day * 2 + test) % 3) + 3;
                const pants = ((day + test * 2) % 3) + 3;
                q = `Javohirda ${shirts} xil ko‘ylak va ${pants} xil shim bor. U necha xil turli kiyim to‘plami qila oladi?`;
                answer = shirts * pants;
                wrong = [shirts + pants, shirts * (pants - 1), shirts * pants + 2];
            } else {
                const a = ((day * 3 + test) % 3) + 2;
                const b = ((day * 2 + test * 2) % 4) + 3;
                const c = ((day + test) % 3) + 2;
                q = `(${a}² × ${b}) − ${c * c} = ?`;
                answer = a * a * b - c * c;
                wrong = [a * b - c, a * a * b, a * a * b - c * c + 5];
            }
        }
    }

    if (!wrong || !Array.isArray(wrong) || wrong.length < 3) {
        if (typeof answer === "number") {
            wrong = [
                answer + 2,
                Math.max(0, answer - 2),
                answer + 5
            ];
        } else {
            wrong = ["Variant A", "Variant B", "Variant C"];
        }
    }

    // Variantlarni to'liq aralashtiramiz (javob endi faqat 2-o'rinda turmaydi)
    const choices = shuffleChoices(answer, wrong, seed);

    return {
        topic,
        q,
        answer,
        choices
    };
}

// TESTNI OCHISH

let autoAdvanceTimer = null;

// TESTNI OCHISH

function openTest(li, day, test) {

    clearTimeout(autoAdvanceTimer);

    active = {
        li,
        day,
        test,
        key: testKey(li, day, test),
        ...makeQuestion(li, day, test)
    };

    selected = null;
    checked = false;

    $("testLevel").textContent = LEVELS[li].name;
    $("testDay").textContent = `${day}-kun`;
    $("testNumber").textContent = `Test ${test} / 3`;
    $("testProgress").style.width = `${(test - 1) / 3 * 100}%`;
    $("testTitle").textContent = `${day}-kun — ${test}-test (${active.topic})`;
    $("questionText").textContent = active.q;
    $("testFeedback").textContent = "";
    $("testFeedback").className = "feedback";
    $("answerList").innerHTML = "";

    // Oldingi testga qaytish tugmasi
    if ($("prevTestBtn")) {
        if (test > 1) {
            $("prevTestBtn").textContent = `⬅️ ${test - 1}-test`;
        } else {
            $("prevTestBtn").textContent = `⬅️ Darslarga qaytish`;
        }
    }

    active.choices.forEach(choice => {
        const btn = document.createElement("button");
        btn.className = "answer-option";
        btn.type = "button";
        btn.dataset.choice = String(choice);
        btn.innerHTML = `<span>${choice}</span>`;

        btn.addEventListener("click", () => {
            selectAndCheckAnswer(choice, btn);
        });

        $("answerList").appendChild(btn);
    });

    $("testAction").textContent = "Javobni tanlang";
    $("testAction").disabled = true;

    const modal = $("testModal");
    if (modal) {
        modal.style.display = "grid";
        modal.classList.remove("hidden");
    }
}

// STREAK

function updateStreak() {

    const today = new Date().toLocaleDateString("en-CA");

    if (state.lastDay !== today) {

        const yesterday = new Date(
            Date.now() - 86400000
        ).toLocaleDateString("en-CA");

        state.streak =
            state.lastDay === yesterday
                ? state.streak + 1
                : 1;

        state.lastDay = today;
    }
}

// XABAR

function showToast(message) {

    const el = $("toast");

    el.textContent = message;

    el.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        el.classList.remove("show");
    }, 2600);
}

// TESTNI YOPISH / ORTGA QAYTISH

function closeTest() {
    clearTimeout(autoAdvanceTimer);
    const modal = $("testModal");
    if (modal) {
        modal.style.display = "none";
        modal.classList.add("hidden");
    }
    active = null;
    checked = false;
    selected = null;
}

// OLDINGI TESTGA QAYTISH

function goToPrevTest() {
    clearTimeout(autoAdvanceTimer);
    if (!active) {
        closeTest();
        return;
    }
    const { li, day, test } = active;
    if (test > 1) {
        openTest(li, day, test - 1);
    } else {
        closeTest();
    }
}

window.closeTest = closeTest;
window.goToPrevTest = goToPrevTest;

// JAVOBNI TEKSHIRISH VA BELGILASH (TO'G'RI / NOTO'G'RI)

function selectAndCheckAnswer(choice, clickedBtn) {
    if (!active || checked) return;

    selected = choice;
    checked = true;

    const isCorrect = String(choice) === String(active.answer);

    [...$("answerList").children].forEach(btn => {
        btn.disabled = true;
        const btnChoice = btn.dataset.choice;
        const isThisAnswer = btnChoice === String(active.answer);
        const isThisSelected = btnChoice === String(choice);

        if (isThisAnswer) {
            btn.classList.add("correct");
            btn.classList.remove("selected", "wrong");
            btn.innerHTML = `
                <span>${btnChoice}</span>
                <span class="answer-badge-status good">✓ To‘g‘ri javob</span>
            `;
        } else if (isThisSelected) {
            btn.classList.add("wrong");
            btn.classList.remove("selected", "correct");
            btn.innerHTML = `
                <span>${btnChoice}</span>
                <span class="answer-badge-status bad">✕ Noto‘g‘ri</span>
            `;
        }
    });

    const isFirstTime = !state.completed.includes(active.key);
    if (isFirstTime) {
        state.completed.push(active.key);
    }

    if (isCorrect) {
        if (isFirstTime) {
            state.coins = (state.coins || 0) + 1;
            $("testFeedback").textContent = "To‘g‘ri javob! Barakalla! 🎉 (+1 coin 🪙)";
        } else {
            $("testFeedback").textContent = "To‘g‘ri javob! Barakalla! 🎉 (Mashq rejimi)";
        }
        $("testFeedback").className = "feedback good";
    } else {
        $("testFeedback").textContent = `Noto‘g‘ri javob. To‘g‘ri javob: ${active.answer}`;
        $("testFeedback").className = "feedback bad";
    }

    saveProgress();
    renderLevels();
    updateStats();

    const isLast = active.test >= 3;
    $("testAction").textContent = isLast ? "Kunni yakunlash 🏆" : "Keyingi savol ➜";
    $("testAction").disabled = false;

    // To'g'ri yoki noto'g'ri bo'lishidan qat'i nazar, keyingi savolga o'tadi
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(() => {
        advanceNextTest();
    }, 1250);
}

function advanceNextTest() {
    clearTimeout(autoAdvanceTimer);
    if (!active) return;
    const { li, day, test } = active;

    if (test < 3) {
        openTest(li, day, test + 1);
    } else {
        // 3-test tugagach kun yakunlanadi
        const gDay = globalDay(li, day);
        const now = Date.now();
        state.completedDayTimes = state.completedDayTimes || {};
        state.completedDayTimes[gDay] = now;
        state.lastCompletedTime = now;

        updateStreak();
        state.coins = (state.coins || 0) + 2;

        let bonusText = "";
        if (day % 15 === 0) {
            state.coins += 10;
            bonusText = " va 15 kunlik bosqich uchun +10 coin";
        }

        saveProgress();
        updateStats();
        renderLevels();
        closeTest();
        showToast(`🎉 ${day}-kun yakunlandi! +2 coin bonus${bonusText} oldingiz 🪙. Keyingi kun 24 soatdan so‘ng ochiladi!`);
    }
}

function handleNextOrRetry() {
    advanceNextTest();
}

const handleTestAction = handleNextOrRetry;

// BO‘LIMLAR

function showPage(page) {

    closeTest();

    const learnPage = $("learnPage");
    const shopPage = $("shopPage");

    if (learnPage) {
        learnPage.classList.toggle("hidden", page !== "learn");
        learnPage.style.display = page === "learn" ? "block" : "none";
    }

    if (shopPage) {
        shopPage.classList.toggle("hidden", page !== "shop");
        shopPage.style.display = page === "shop" ? "block" : "none";
    }

    document.querySelectorAll(".nav-btn").forEach(btn => {

        btn.classList.toggle(
            "active",
            btn.dataset.page === page
        );
    });

    if (page === "shop") {
        updateShopCounters();
        renderShop();
        renderInventory();
    }
}

// SHIRINLIKLAR DO'KONI (SHOP) MAHSULOTLARI

const SHOP_PRODUCTS = [
    {
        id: "nesquik_cocoa",
        name: "Nesquik Shokoladli Kakao",
        categories: ["nesquik", "drink"],
        price: 4,
        icon: "🥤",
        badge: "Eng Sevimli ❤️",
        bgGradient: "linear-gradient(135deg, #fff3bf 0%, #ffe066 100%)",
        flavor: "Sutli Kakao",
        specs: "250g quti",
        description: "Issiq sut bilan ichiladigan vitaminlarga boy va ertalabki energiya beruvchi mashhur Nesquik kakaosi."
    },
    {
        id: "nesquik_bar",
        name: "Nesquik Sutli Shokolad",
        categories: ["nesquik", "chocolate"],
        price: 3,
        icon: "🍫",
        badge: "Hit Mahsulot 🔥",
        bgGradient: "linear-gradient(135deg, #ffec99 0%, #ffd43b 100%)",
        flavor: "Sut & Vafli kremi",
        specs: "43g batonchik",
        description: "Bolajonlarning sevimli mayin sutli kremli va qarsildoq qatlamli haqiqiy Nesquik shokoladi."
    },
    {
        id: "nesquik_cereal",
        name:"Shokoladli Sharlar",
        categories: ["nesquik", "cookie"],
        price: 10,
        icon: "🥣",
        badge: "Quvvatli Nonushta ☀️",
        bgGradient: "linear-gradient(135deg, #ffe066 0%, #fcc419 100%)",
        flavor: "Shokoladli qarsildoq",
        specs: "375g qadoq",
        description: "Nonushtada sutga solib yeyiladigan, butun kun davomida a'lo kayfiyat beruvchi mazali sharlar."
    },
    {
        id: "nesquik_wafer",
        name: "Crispy Vafli",
        categories: ["nesquik", "cookie"],
        price: 6,
        icon: "🧇",
        badge: "Qarsildoq ✨",
        bgGradient: "linear-gradient(135deg, #fff3bf 0%, #fab005 100%)",
        flavor: "Kakao & Vafli",
        specs: "35g x 2 dona",
        description: "Shokolad kremli, har bir tishlamda nozik erib ketuvchi qarsildoq va xushbo'y vafli."
    },
    {
        id: "nesquik_box",
        name: "Mega Sovg'a Qutisi",
        categories: ["nesquik", "chocolate", "drink"],
        price: 22,
        icon: "🎁",
        badge: "Super To‘plam 👑",
        bgGradient: "linear-gradient(135deg, #ffe066 0%, #f59f00 100%)",
        flavor: "Kakao + Shokolad + Krujka",
        specs: "Eksklyuziv sovg'a",
        description: "Katta Nesquik kakao bankasi, shokolad batonchasi va maxsus sariq Nesquik quyonchali krujka to'plami!"
    },
    {
        id: "nutella",
        name: "Nutella Shokolad Pastasi",
        categories: ["chocolate"],
        price: 30,
        icon: "🌰",
        badge: "Premium 🌟",
        bgGradient: "linear-gradient(135deg, #ffd8a8 0%, #ffa94d 100%)",
        flavor: "O‘rmon yong‘og‘i",
        specs: "350g banka",
        description: "Italiya sifatidagi xushbo'y o'rmon yong'og'i va tabiiy kakao bilan tayyorlangan shirinlik."
    },
    {
        id: "kitkat",
        name: "KitKat 4 Fingers",
        categories: ["chocolate", "cookie"],
        price: 6,
        icon: "🍫",
        badge: "Tanaffus Vaqti ☕",
        bgGradient: "linear-gradient(135deg, #ffc9c9 0%, #ff8787 100%)",
        flavor: "Qarsildoq Vafli",
        specs: "45g baton",
        description: "Tanaffus qil, KitKat bilan quvvatlan! Mayin sutli shokolad va qarsildoq vafli bo'laklari."
    },
    {
        id: "snickers",
        name: "Super snickers",
        categories: ["chocolate"],
        price: 3,
        icon: "🥜",
        badge: "To‘yimli 🚀",
        bgGradient: "linear-gradient(135deg, #fed7aa 0%, #ea580c 100%)",
        flavor: "Yong‘oq & Karamel",
        specs: "80g (2x40g)",
        description: "Och qoldingmi? Snickers yeb ol! Qovurilgan yer yong'oq, nuga va quyuq qaymoqli karamel."
    },
    {
        id: "kinder_joy",
        name: "Kinder Syurpriz",
        categories: ["chocolate"],
        price: 12,
        icon: "🥚",
        badge: "O‘yinchoq Ichida 🎪",
        bgGradient: "linear-gradient(135deg, #fecdd3 0%, #fb7185 100%)",
        flavor: "Sut & Kakao kremi",
        specs: "20g + O‘yinchoq",
        description: "Ikki dona qarsildoq vafli sharlari, nozik sutli krem va ichida kutilmagan ajoyib o'yinchoq!"
    },
    {
        id: "oreo",
        name: "Oreo",
        categories: ["cookie"],
        price: 7,
        icon: "🍪",
        badge: "Klassika 🖤",
        bgGradient: "linear-gradient(135deg, #bfdbfe 0%, #60a5fa 100%)",
        flavor: "Shokolad & Vanil",
        specs: "95g qadoq",
        description: "Aylantir, yalab ko'r va sutga botir! Ikki qora pechyonka orasidagi nozik vanilli krem."
    },
    {
        id: "mms",
        name: "M&M's Shokoladli konfetlar",
        categories: ["candy", "chocolate"],
        price: 6,
        icon: "🔴",
        badge: "Rang-barang 🌈",
        bgGradient: "linear-gradient(135deg, #fef08a 0%, #f87171 100%)",
        flavor: "Sutli shokolad",
        specs: "45g paket",
        description: "Qo'lda erimaydi, og'izda eriydi! Rang-barang quvnoq va shirin shokolad drajélari."
    },
    {
        id: "chocopie",
        name: "Choco Pie",
        categories: ["cookie"],
        price: 5,
        icon: "🥧",
        badge: "Yumshoq Zefir ☁️",
        bgGradient: "linear-gradient(135deg, #fed7aa 0%, #fb923c 100%)",
        flavor: "Zefir & Biskvit",
        specs: "6 dona quti",
        description: "Ikki dona yumshoq biskvit orasidagi havodor oq marshmallow va shokoladli sir."
    },
    {
        id: "zizi",
        name: "Saqich",
        categories: ["candy", "saqich"],
        price: 1,
        icon: "🍬",
        badge: "5ta chaynash",
        bgGradient: "linear-gradient(135deg, #fef3c7 0%, #f59e0b 100%)",
        flavor: "O‘rmon mevalari",
        specs: "55g",
        description: "Rang-barang, shirin o‘rmon mevalari ta'mli saqich."
    },
    {
        id: "haribo",
        name: "Marmelad",
        categories: ["candy"],
        price: 4,
        icon: "🐻",
        badge: "Meva Ta‘mlari 🍓",
        bgGradient: "linear-gradient(135deg, #bbf7d0 0%, #4ade80 100%)",
        flavor: "Olma, Qulupnay, Apelsin",
        specs: "100g qopcha",
        description: "Dunyoga mashhur mevali quvnoq ayiqchalar. 100% tabiiy meva sharbatlari asosida tayyorlangan."
    },
    {
        id: "raffaello",
        name: "Raffaello Nozik Konfet",
        categories: ["candy", "chocolate"],
        price: 13,
        icon: "🥥",
        badge: "Nozik Ta‘m 🤍",
        bgGradient: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
        flavor: "Kokos & Bodom",
        specs: "150g quti",
        description: "Oq krem, butun oq bodom donasi va qor kabi oppoq kokos qirindisi uyg'unligi."
    }
];

let currentShopCategory = "all";
let currentShopView = "catalog";

function updateShopCounters() {
    if (!state) return;
    if ($("shopCoinCount")) {
        $("shopCoinCount").textContent = state.coins;
    }
    if ($("shopCatalogCount")) {
        $("shopCatalogCount").textContent = SHOP_PRODUCTS.length;
    }
    if ($("myInventoryCount")) {
        const totalOwned = Object.values(state.inventory || {}).reduce((sum, qty) => sum + qty, 0);
        $("myInventoryCount").textContent = totalOwned;
    }
}

function renderShop() {
    if (!state) return;
    updateShopCounters();

    const grid = $("shopProductsGrid");
    if (!grid) return;
    grid.innerHTML = "";

    const filtered = SHOP_PRODUCTS.filter(product => {
        if (currentShopCategory === "all") return true;
        return product.categories.includes(currentShopCategory);
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--muted); font-size: 15px;">
                Ushbu bo‘limda hozircha mahsulot yo‘q.
            </div>
        `;
        return;
    }

    filtered.forEach(item => {
        const owned = (state.inventory && state.inventory[item.id]) || 0;
        const card = document.createElement("div");
        card.className = "product-card";

        card.innerHTML = `
            <span class="product-badge">${item.badge}</span>
            <div class="product-img-box" style="background: ${item.bgGradient};">
                ${item.icon}
            </div>
            <div class="product-content">
                <div class="product-meta">
                    <span class="meta-pill">${item.flavor}</span>
                    <span class="meta-pill">${item.specs}</span>
                </div>
                ${owned > 0 ? `<div class="owned-indicator">✓ Sizda bor: ${owned} dona</div>` : ""}
                <h3 class="product-title">${item.name}</h3>
                <p class="product-desc">${item.description}</p>
                <div class="product-footer">
                    <div class="price-tag">
                        🪙 <b>${item.price}</b> <span style="font-size: 12px; font-weight: 700; color: #868e96;">coin</span>
                    </div>
                    <button class="buy-btn" data-id="${item.id}" type="button">
                        Sotib olish
                    </button>
                </div>
            </div>
        `;

        card.querySelector(".buy-btn").addEventListener("click", () => {
            buyProduct(item.id);
        });

        grid.appendChild(card);
    });
}

function buyProduct(productId) {
    if (!state) state = loadProgress();
    const product = SHOP_PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const currentCoins = typeof state.coins === "number" ? state.coins : 0;
    if (currentCoins < product.price) {
        showToast(`🪙 Coinlaringiz yetarli emas! Sizda ${currentCoins} coin bor, kerak: ${product.price} coin.`);
        return;
    }

    state.coins = currentCoins - product.price;
    if (!state.inventory) state.inventory = {};
    state.inventory[productId] = (state.inventory[productId] || 0) + 1;

    saveProgress();
    updateStats();
    renderShop();
    renderInventory();

    showToast(`🎉 Xaridingiz bilan! "${product.name}" sotib olindi!`);
}

function consumeProduct(productId) {
    if (!state || !state.inventory || !state.inventory[productId] || state.inventory[productId] <= 0) {
        return;
    }

    const product = SHOP_PRODUCTS.find(p => p.id === productId);
    const name = product ? product.name : "Shirinlik";

    state.inventory[productId]--;
    if (state.inventory[productId] === 0) {
        delete state.inventory[productId];
    }

    saveProgress();
    updateStats();
    renderShop();
    renderInventory();

    showToast(`😋 Judayam mazali! 1 dona "${name}" iste'mol qilindi. Kayfiyat a'lo! ✨`);
}

function renderInventory() {
    if (!state) return;
    updateShopCounters();

    const grid = $("inventoryGrid");
    const emptyBox = $("emptyInventory");
    if (!grid || !emptyBox) return;

    grid.innerHTML = "";
    const items = Object.entries(state.inventory || {}).filter(([_, qty]) => qty > 0);

    if (items.length === 0) {
        grid.classList.add("hidden");
        emptyBox.classList.remove("hidden");
        return;
    }

    grid.classList.remove("hidden");
    emptyBox.classList.add("hidden");

    items.forEach(([id, qty]) => {
        const product = SHOP_PRODUCTS.find(p => p.id === id);
        if (!product) return;

        const card = document.createElement("div");
        card.className = "inventory-card";

        card.innerHTML = `
            <span class="inv-badge-qty">${qty} dona</span>
            <div class="inv-icon">${product.icon}</div>
            <h3 class="inv-title">${product.name}</h3>
            <p class="inv-cat">${product.flavor} • ${product.specs}</p>
            <button class="consume-btn" data-id="${id}" type="button">
                😋 Bahra olish
            </button>
        `;

        card.querySelector(".consume-btn").addEventListener("click", () => {
            consumeProduct(id);
        });

        grid.appendChild(card);
    });
}

function switchShopView(view) {
    currentShopView = view;
    const isCatalog = view === "catalog";

    $("shopProductsView").classList.toggle("hidden", !isCatalog);
    $("shopInventoryView").classList.toggle("hidden", isCatalog);
    $("categoryTabs").style.display = isCatalog ? "flex" : "none";

    $("shopTabBtn").classList.toggle("active", isCatalog);
    $("inventoryTabBtn").classList.toggle("active", !isCatalog);

    if (isCatalog) {
        renderShop();
    } else {
        renderInventory();
    }
}

window.buyProduct = buyProduct;
window.consumeProduct = consumeProduct;
window.showPage = showPage;
window.closeTest = closeTest;
window.goToPrevTest = goToPrevTest;
window.switchShopView = switchShopView;
window.advanceNextTest = advanceNextTest;
window.handleNextOrRetry = handleNextOrRetry;

// TUGMALAR

document.querySelectorAll(".nav-btn").forEach(btn => {

    btn.addEventListener("click", () => {
        showPage(btn.dataset.page);
    });
});

$("testAction").addEventListener(
    "click",
    handleNextOrRetry
);

// ORTGA QAYTISH VA TESTNI YOPISH
if ($("backTestBtn")) {
    $("backTestBtn").addEventListener("click", closeTest);
}

if ($("prevTestBtn")) {
    $("prevTestBtn").addEventListener("click", goToPrevTest);
}

if ($("backTestBottomBtn")) {
    $("backTestBottomBtn").addEventListener("click", closeTest);
}

if ($("closeTest")) {
    $("closeTest").addEventListener("click", closeTest);
}

if ($("cancelTestBtn")) {
    $("cancelTestBtn").addEventListener("click", closeTest);
}

// Modal foniga (kartochkadan tashqariga) bosilganda yopish
$("testModal").addEventListener("click", e => {
    if (!e.target.closest(".test-card")) {
        closeTest();
    }
});

// ESC tugmasi bosilganda testni yopish
document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        closeTest();
    }
});

// Brauzerning Ortga (Back) tugmasi bosilganda testni yopish
window.addEventListener("popstate", () => {
    if (!$("testModal").classList.contains("hidden")) {
        closeTest();
    }
});

// DO'KON TUGMALARI VA HODISALARI

if ($("dailyBonusBtn")) {
    $("dailyBonusBtn").addEventListener("click", () => {
        if (!state) return;
        const today = new Date().toLocaleDateString("en-CA");
        if (state.lastBonusDate === today) {
            showToast("Siz bugungi bonusni olgansiz. Yangi bonus ertaga beriladi! 😊");
            return;
        }
        state.coins = (state.coins || 0) + 5;
        state.lastBonusDate = today;
        saveProgress();
        updateStats();
        renderShop();
        renderInventory();
        showToast("🎁 Tabriklaymiz! Sizga 5 coin kunlik bonus berildi! 🎉");
    });
}

document.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentShopCategory = btn.dataset.cat;
        renderShop();
    });
});

if ($("shopTabBtn")) {
    $("shopTabBtn").addEventListener("click", () => switchShopView("catalog"));
}

if ($("inventoryTabBtn")) {
    $("inventoryTabBtn").addEventListener("click", () => switchShopView("inventory"));
}

if ($("goShoppingBtn")) {
    $("goShoppingBtn").addEventListener("click", () => switchShopView("catalog"));
}

// SAYTNI ISHGA TUSHIRISH

if (currentUser && accounts[currentUser]) {

    enterSite();

} else {

    currentUser = "";

    localStorage.removeItem("mathway_current_user");

    showAuth();
}

// HAR 10 SONIYADA 24 SOATLIK TAYMERNI JONLI YANGILAB TURISH
setInterval(() => {
    if (currentUser && $("learnPage") && $("learnPage").style.display !== "none") {
        const waitingCards = document.querySelectorAll(".day-card.waiting");
        if (waitingCards.length > 0) {
            renderLevels();
        }
    }
}, 10000);
