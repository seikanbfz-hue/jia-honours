/* Published YouTube IDs for the V9 film. Keep each language mapped explicitly. */
window.JIA_VISION_VIDEO_IDS = Object.freeze({
  zh: 'OnEt8TNVrhk',
  en: 'jNj7ekPyBvE',
  ja: 'r58LlaIkgUY'
});

(function () {
  'use strict';
  const COPY = {
    zh: {
      kicker: 'OUR VISION', title: '荣誉的下一程',
      description: '以家族、慈善与文化传承，展望荣誉的下一程。',
      note: '组织愿景 · AI 概念影像 · 59 秒',
      play: '播放中文宣传片', external: '在 YouTube 观看中文版',
      privacy: '点击播放后将连接 YouTube。',
      pending: '影片正在准备中。', player: '荣誉的下一程 — 中文宣传片'
    },
    en: {
      kicker: 'OUR VISION', title: 'The Next Chapter of Honour',
      description: 'Looking ahead through family, charity and cultural heritage.',
      note: 'Our vision · AI concept film · 59 seconds',
      play: 'Play the English film', external: 'Watch in English on YouTube',
      privacy: 'Playing the film connects to YouTube.',
      pending: 'The film is being prepared.', player: 'The Next Chapter of Honour — English film'
    },
    ja: {
      kicker: 'OUR VISION', title: '栄誉の、その先へ',
      description: '家族、慈善、文化の継承を通じて、栄誉の次の一歩を描きます。',
      note: '私たちの願い · AI コンセプト映像 · 59 秒',
      play: '日本語の映像を再生', external: 'YouTube で日本語版を見る',
      privacy: '再生すると YouTube に接続します。',
      pending: '映像を準備しています。', player: '栄誉の、その先へ — 日本語版'
    }
  };
  let currentLanguage = null;
  let currentVideoId = null;

  function validVideoId(value) {
    return typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value) ? value : '';
  }

  function render(language) {
    const section = document.getElementById('vision-film');
    if (!section) return;
    const lang = Object.prototype.hasOwnProperty.call(COPY, language) ? language : 'zh';
    const text = COPY[lang];
    const ids = window.JIA_VISION_VIDEO_IDS || {};
    const videoId = validVideoId(ids[lang]);
    if (lang === currentLanguage && videoId === currentVideoId) return;
    currentLanguage = lang;
    currentVideoId = videoId;
    section.dataset.filmLanguage = lang;
    section.querySelectorAll('[data-film-copy]').forEach(function (element) {
      const key = element.getAttribute('data-film-copy');
      if (Object.prototype.hasOwnProperty.call(text, key)) element.textContent = text[key];
    });

    // Removing the old iframe also stops its audio when visitors change language.
    const player = document.getElementById('vision-film-player');
    player.replaceChildren();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vision-film-cover';
    button.setAttribute('aria-label', videoId ? text.play : text.pending);
    button.disabled = !videoId;
    const poster = document.createElement('img');
    poster.src = 'assets/vision-film-' + lang + '.jpg';
    poster.alt = '';
    poster.width = 1920;
    poster.height = 1080;
    poster.loading = 'lazy';
    poster.decoding = 'async';
    button.appendChild(poster);
    const icon = document.createElement('span');
    icon.className = 'vision-film-play-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '▶';
    button.appendChild(icon);
    const label = document.createElement('span');
    label.className = 'vision-film-play-label';
    label.textContent = videoId ? text.play : text.pending;
    button.appendChild(label);
    if (videoId) button.addEventListener('click', function () {
      const iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?autoplay=1&rel=0&hl=' + lang;
      iframe.title = text.player;
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      player.replaceChildren(iframe);
    }, { once: true });
    player.appendChild(button);
    const external = document.getElementById('vision-film-external');
    external.hidden = !videoId;
    if (videoId) external.href = 'https://www.youtube.com/watch?v=' + videoId;
    else external.removeAttribute('href');
    document.getElementById('vision-film-privacy').hidden = !videoId;
  }

  window.JiaVisionFilm = Object.freeze({ render: render });
})();
