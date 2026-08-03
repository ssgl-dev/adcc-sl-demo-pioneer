/* ============================================================
   ADCC 视频播放器 — 右下角浮动 + 点击句子跳转视频时间戳
   用法:
     - 视频文件放入 /video/{alertId}/video.mp4
     - 时间戳配置放入 /video/{alertId}/timestamps.json  (可选)
     - 无配置时自动均分视频时长
   ============================================================ */

(function () {
  "use strict";

  // ==========================================================
  // 配置
  // ==========================================================
  const ALERT_ID = (() => {
    const m = location.pathname.match(/alerts-([^/]+)\.html/);
    return m ? m[1] : "";
  })();

  const VIDEO_URL = `/video/${ALERT_ID}/video.mp4`;
  const TIMESTAMPS_URL = `/video/${ALERT_ID}/timestamps.json`;
  const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2];

  // ==========================================================
  // 状态
  // ==========================================================
  let sentences = [];    // { el, text, index }
  let segments = [];     // [{ start: seconds, end: seconds }] 时间戳映射
  let currentIdx = -1;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let timeUpdateHandler = null;

  // ==========================================================
  // DOM (在 initUI 中填充)
  // ==========================================================
  let playerEl, videoEl, progressFill, timeCurrent;
  let timeDuration, btnSpeed, btnExpand;
  let speedIdx = 0; // SPEED_OPTIONS[0] + 0.25 实际 1.25x，显示 1x
  let sizeLevel = 2; // 0=xs 200px, 1=sm 260px, 2=md 320px, 3=lg 380px, 4=xl 440px

  // ==========================================================
  // 找出所有可朗读的段落
  // ==========================================================
  function findSentences() {
    const items = [];
    let idx = 0;

    function addItem(el, text) {
      text = text.trim();
      if (!text) return;
      items.push({ el, text, index: idx });
      idx++;
    }

    // 1. 页面标题
    const titleSpan = document.querySelector("h1._content-title span");
    if (titleSpan && titleSpan.textContent.trim()) {
      addItem(titleSpan, titleSpan.textContent);
    }

    // 2. 日期
    const dateEl = document.querySelector("._content-title ._date");
    if (dateEl && dateEl.textContent.trim()) {
      addItem(dateEl, dateEl.textContent);
    }

    // 3. 正文：將連續的區塊元素合併為一個大段（以空白段落分隔）
    const BLOCK_TAGS = new Set(["p", "li", "h1", "h2", "h3", "h4"]);
    const content = document.querySelector("div.fr-view");
    if (content) {
      // 按文檔順序收集所有區塊元素
      const flatBlocks = [];
      const walker = document.createTreeWalker(
        content,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: function (node) {
            const tag = node.tagName ? node.tagName.toLowerCase() : "";
            if (BLOCK_TAGS.has(tag)) {
              // 跳過被其他區塊元素包在裡面的
              let p = node.parentElement;
              while (p && p !== content) {
                if (BLOCK_TAGS.has(p.tagName.toLowerCase())) return NodeFilter.FILTER_SKIP;
                p = p.parentElement;
              }
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          },
        }
      );
      while (walker.nextNode()) flatBlocks.push(walker.currentNode);

      // 將連續的非空元素合併成 chunk
      let chunkEls = [];
      let chunkTexts = [];
      function flushChunk() {
        if (chunkEls.length > 0) {
          const mergedText = chunkTexts.join(" ");
          // 用第一個元素作為錨點
          addItem(chunkEls[0], mergedText);
          chunkEls = [];
          chunkTexts = [];
        }
      }

      for (const el of flatBlocks) {
        const text = el.textContent.trim();
        const isEmpty = !text || text === "\xa0";

        if (isEmpty) {
          flushChunk(); // 空白段落 = 分段邊界
        } else {
          chunkEls.push(el);
          chunkTexts.push(text);
        }
      }
      flushChunk(); // 最後一個 chunk

      // 4. 扫描 .fr-view 内的图片 alt 文本
      const images = content.querySelectorAll("img");
      images.forEach(img => {
        const alt = (img.getAttribute("alt") || "").trim();
        if (alt) addItem(img, alt);
      });
    }

    return items;
  }

  // ==========================================================
  // 创建浮动播放器 UI
  // ==========================================================
  function createPlayer() {
    const el = document.createElement("div");
    el.className = "adcc-video-player";
    el.innerHTML = `
      <div class="adcc-video-body">
        <video preload="metadata" playsinline></video>
      </div>
      <button class="btn-close" title="關閉">✕</button>
      <div class="adcc-video-controls">
        <div class="progress-wrap">
          <div class="time-row">
            <span class="time-current">00:00</span>
            <span>/</span>
            <span class="time-duration">00:00</span>
          </div>
          <div class="progress-bar">
            <div class="fill" style="width:0%">
            </div>
          </div>
        </div>
        <button class="btn-speed" title="切換播放速度">1x</button>
        <div class="actions-row">
          <button class="btn-expand" title="放大">⛶</button>
        </div>
      </div>
    `;
    return el;
  }

  function initUI() {
    if (playerEl) return;
    playerEl = createPlayer();
    document.body.appendChild(playerEl);

    // 缓存引用
    videoEl      = playerEl.querySelector("video");
    timeCurrent  = playerEl.querySelector(".time-current");
    timeDuration = playerEl.querySelector(".time-duration");
    progressFill = playerEl.querySelector(".progress-bar .fill");
    btnSpeed     = playerEl.querySelector(".btn-speed");
    btnExpand    = playerEl.querySelector(".btn-expand");
    const closeBtn    = playerEl.querySelector(".btn-close");

    // 事件
    btnSpeed.addEventListener("click", onSpeedClick);
    btnExpand.addEventListener("click", cycleSize);
    closeBtn.addEventListener("click", closePlayer);

    // 应用初始尺寸
    applySize();

    // 视频元数据加载
    videoEl.addEventListener("loadedmetadata", () => {
      timeDuration.textContent = formatTime(videoEl.duration);
      applySpeed(); // 初始化播放速度
      // 如果没有手动配置时间戳，自动均分
      if (segments.length === 0 && sentences.length > 0) {
        autoDistributeSegments();
      }
    });

    // 视频进度更新
    videoEl.addEventListener("timeupdate", onTimeUpdate);

    // 视频播放结束 → 自动播放下一段或停止
    videoEl.addEventListener("ended", () => {
      if (currentIdx >= 0 && currentIdx < segments.length - 1) {
        playSentence(currentIdx + 1);
      } else {
        highlightSentence(-1);
      }
    });

    // 拖拽（视频区域或控制面板都可拖拽）
    const dragHandle = playerEl.querySelector(".adcc-video-body");
    dragHandle.addEventListener("mousedown", onDragStart);
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", onDragEnd);
    dragHandle.addEventListener("touchstart", onDragStart, { passive: false });
    document.addEventListener("touchmove", onDragMove, { passive: false });
    document.addEventListener("touchend", onDragEnd);
  }

  // ==========================================================
  // 时间戳映射
  // ==========================================================
  async function loadTimestamps() {
    try {
      const resp = await fetch(TIMESTAMPS_URL);
      if (!resp.ok) return false;
      const data = await resp.json();
      if (data.segments && data.segments.length > 0) {
        segments = data.segments;
        // 可选: 覆盖默认视频 URL
        if (data.videoUrl) {
          videoEl.src = data.videoUrl;
        }
        console.log(`Player: 加载时间戳配置 ${segments.length} 段`);
        return true;
      }
    } catch (e) {
      // 配置文件不存在，使用自动均分
    }
    return false;
  }

  function autoDistributeSegments() {
    if (!videoEl.duration || sentences.length === 0) return;
    const total = videoEl.duration;
    const n = sentences.length;
    const segDuration = total / n;
    segments = sentences.map((_, i) => ({
      start: i * segDuration,
      end: Math.min((i + 1) * segDuration, total),
    }));
    console.log(`Player: 自动均分 ${n} 段，每段 ${segDuration.toFixed(1)}s`);
  }

  // ==========================================================
  // 段落播放按钮
  // ==========================================================
  function addPlayButtons() {
    sentences.forEach((item, i) => {
      const el = item.el;

      // 图片元素：取消覆盖层播放按钮逻辑，不再为图片添加播放按钮
      if (el.tagName === "IMG") {
        el.classList.add("adcc-speakable");
        return;
      }

      el.classList.add("adcc-speakable");

      const btn = document.createElement("button");
      btn.className = "adcc-play-btn";
      btn.innerHTML = "▶";
      btn.title = "播放此段影片";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        playSentence(i);
      });

      // 按钮追加到元素末尾（inline-flex 跟在文字后面）
      el.appendChild(btn);
    });
  }

  // ==========================================================
  // 播放控制
  // ==========================================================
  function playSentence(idx) {
    if (idx < 0 || idx >= sentences.length) return;
    currentIdx = idx;

    // 加载视频（首次）
    if (!videoEl.src || videoEl.src === window.location.href) {
      videoEl.src = VIDEO_URL;
      videoEl.load();
    }

    // 显示播放器
    playerEl.classList.add("active");
    playerEl.classList.remove("minimized");

    // 跳转时间戳
    if (idx < segments.length) {
      videoEl.currentTime = segments[idx].start;
    }

    videoEl.play().catch((e) => {
      console.warn("视频播放失败:", e.message);
    });

    highlightSentence(idx);
    item.scrollIntoViewIfNeeded();
  }

  function onTimeUpdate() {
    if (!videoEl.duration) return;
    const pct = (videoEl.currentTime / videoEl.duration) * 100;
    progressFill.style.width = pct + "%";
    timeCurrent.textContent = formatTime(videoEl.currentTime);

    // 自动高亮当前段
    if (segments.length > 0) {
      const t = videoEl.currentTime;
      for (let i = segments.length - 1; i >= 0; i--) {
        if (t >= segments[i].start - 0.1) {
          if (currentIdx !== i) {
            currentIdx = i;
            highlightSentence(i);
          }
          break;
        }
      }
    }
  }

  function onSpeedClick() {
    speedIdx = (speedIdx + 1) % SPEED_OPTIONS.length;
    applySpeed();
  }

  function applySpeed() {
    const speed = SPEED_OPTIONS[speedIdx];
    videoEl.playbackRate = speed + 0.25;
    btnSpeed.textContent = speed + "x";
  }

  // ==========================================================
  // 拖拽窗口
  // ==========================================================
  function onDragStart(e) {
    if (e.target.tagName === "BUTTON") return; // 不拦截按钮
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = playerEl.getBoundingClientRect();
    dragOffset.x = clientX - rect.left;
    dragOffset.y = clientY - rect.top;
    playerEl.style.transition = "none";
    e.preventDefault();
  }

  function onDragMove(e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    playerEl.style.right = "auto";
    playerEl.style.bottom = "auto";
    playerEl.style.left = Math.max(0, Math.min(clientX - dragOffset.x, window.innerWidth - playerEl.offsetWidth)) + "px";
    playerEl.style.top = Math.max(0, Math.min(clientY - dragOffset.y, window.innerHeight - playerEl.offsetHeight)) + "px";
    e.preventDefault();
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    playerEl.style.transition = "opacity 0.3s, transform 0.3s";
  }

  // ==========================================================
  // UI 辅助
  // ==========================================================
  function closePlayer() {
    videoEl.pause();
    playerEl.classList.remove("active");
    highlightSentence(-1);
    currentIdx = -1;
  }

  function highlightSentence(idx) {
    sentences.forEach((s, i) => {
      s.el.classList.toggle("speaking", i === idx);
      const btn = s.el.querySelector(".adcc-play-btn");
      if (btn) {
        if (i === idx) {
          btn.classList.add("playing");
          btn.innerHTML = "⏸";
        } else {
          btn.classList.remove("playing");
          btn.innerHTML = "▶";
        }
      }
    });
  }

  // ==========================================================
  // 五级尺寸切换
  // ==========================================================
  function cycleSize() {
    sizeLevel = (sizeLevel + 1) % 5;
    applySize();
  }

  function applySize() {
    playerEl.classList.remove("size-xs", "size-sm", "size-md", "size-lg", "size-xl");
    const labels = ["xs", "sm", "md", "lg", "xl"];
    const titles = ["放大 (當前: 超小)", "放大 (當前: 小)", "放大 (當前: 中)", "放大 (當前: 大)", "縮小 (當前: 超大)"];
    const icons  = ["⛶", "⛯", "⛶", "⛯", "⛶"];

    playerEl.classList.add("size-" + labels[sizeLevel]);
    btnExpand.title = titles[sizeLevel];
    btnExpand.textContent = icons[sizeLevel];

    // 重新定位到右下角，保证完整可见
    resetToBottomRight();
  }

  function resetToBottomRight() {
    playerEl.style.left = "auto";
    playerEl.style.top = "auto";
    playerEl.style.right = "20px";
    playerEl.style.bottom = "20px";
    const rect = playerEl.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      playerEl.style.right = "0px";
      playerEl.style.left = (window.innerWidth - rect.width) + "px";
    }
    if (rect.bottom > window.innerHeight) {
      playerEl.style.bottom = "0px";
      playerEl.style.top = (window.innerHeight - rect.height) + "px";
    }
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  // ==========================================================
  // Polyfill: scrollIntoViewIfNeeded
  // ==========================================================
  Element.prototype.scrollIntoViewIfNeeded = function () {
    const rect = this.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      this.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // ==========================================================
  // 启动
  // ==========================================================
  async function init() {
    sentences = findSentences();
    if (sentences.length === 0) {
      console.warn("ADCC Player: 未找到可朗读的段落");
      return;
    }
    console.log(`ADCC Player: 找到 ${sentences.length} 个段落`);

    initUI();
    addPlayButtons();

    // 尝试加载时间戳配置
    videoEl.src = VIDEO_URL; // 预加载视频
    videoEl.load();
    await loadTimestamps();

    // 视频元数据加载后会触发 autoDistributeSegments (如果没有手动配置)
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
