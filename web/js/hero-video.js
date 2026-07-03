/* BMW / Rolls-Royce–style full-bleed 4K luxury sports hero video (local assets) */
(function () {
  const MUSIC_TRACK = 'assets/audio/hero-drive.mp3';

  const CLIPS = [
    {
      mp4: 'assets/videos/hero-bmw-drift.mp4',
      poster: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1920&h=1080&fit=crop&q=85',
    },
    {
      mp4: 'assets/videos/hero-bmw-m3.mp4',
      poster: 'https://images.unsplash.com/photo-1617814076367-b24023e39d3f?w=1920&h=1080&fit=crop&q=85',
    },
    {
      mp4: 'assets/videos/hero-luxury-showroom.mp4',
      poster: 'https://images.unsplash.com/photo-1631297869054-d41af4c7786a?w=1920&h=1080&fit=crop&q=85',
    },
    {
      mp4: 'assets/videos/hero-sports-mountain.mp4',
      poster: 'https://images.unsplash.com/photo-1503376780353-7bab58726340?w=1920&h=1080&fit=crop&q=85',
    },
    {
      mp4: 'assets/videos/hero-sports-rally.mp4',
      poster: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1920&h=1080&fit=crop&q=85',
    },
    {
      mp4: 'assets/videos/hero-luxury-repair.mp4',
      poster: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1920&h=1080&fit=crop&q=85',
    },
    {
      mp4: 'assets/videos/hero-sports-blue.mp4',
      poster: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&h=1080&fit=crop&q=85',
    },
  ];

  const ROTATE_MS = 18000;
  const LOAD_TIMEOUT_MS = 25000;
  const MUSIC_VOLUME = 0.25;
  const MUSIC_FADE_MS = 700;
  const MUSIC_RETRY_MS = 600;
  const MUSIC_RETRY_MAX = 12;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slowConnection = navigator.connection?.saveData
    || (navigator.connection?.effectiveType || '').includes('2g');

  let clipIndex = 0;
  let activeSlot = 0;
  let rotateTimer = null;
  let musicRetryTimer = null;
  let heroPlaying = false;
  let heroInView = false;
  let heroReady = false;
  let musicAudible = false;
  let videoSlots = null;
  let heroSection = null;

  const heroMusic = document.getElementById('heroBgMusic') || new Audio(MUSIC_TRACK);
  let fadeTimer = null;
  let heroObserver = null;

  heroMusic.loop = true;
  heroMusic.preload = 'auto';
  heroMusic.volume = 0;
  if (!heroMusic.getAttribute('src')) heroMusic.src = MUSIC_TRACK;
  heroMusic.load();

  heroMusic.addEventListener('error', () => {
    heroMusic.load();
  });

  function animateHeroText() {
    document.querySelector('.hero-video__eyebrow')?.classList.add('anim-in');
    document.querySelector('.hero-video__headline')?.classList.add('anim-in');
    document.querySelector('.hero-video__cta')?.classList.add('anim-in');
  }

  function measureHeroInView() {
    if (!heroSection) return false;
    const rect = heroSection.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (rect.bottom <= vh * 0.15 || rect.top >= vh * 0.85) return false;

    const visiblePx = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    if (visiblePx <= 0) return false;

    const visibleRatio = visiblePx / Math.max(rect.height, 1);
    return visibleRatio >= 0.55 && rect.top <= vh * 0.3;
  }

  function shouldPlayMusic() {
    return heroReady && heroPlaying && heroInView && !prefersReduced;
  }

  function refreshHeroVisibility() {
    const inView = measureHeroInView();
    if (inView === heroInView) return;
    heroInView = inView;
    if (!heroReady) return;
    if (inView) resumeHeroPlayback();
    else pauseHeroPlayback();
  }

  function clearFade() {
    if (fadeTimer) {
      window.clearInterval(fadeTimer);
      fadeTimer = null;
    }
  }

  function clearMusicRetries() {
    if (musicRetryTimer) {
      window.clearInterval(musicRetryTimer);
      musicRetryTimer = null;
    }
  }

  function fadeVolume(audio, target) {
    clearFade();
    const from = audio.volume;
    if (Math.abs(from - target) < 0.01) {
      audio.volume = target;
      return;
    }
    const steps = 14;
    const stepMs = MUSIC_FADE_MS / steps;
    let step = 0;
    fadeTimer = window.setInterval(() => {
      step += 1;
      audio.volume = from + ((target - from) * (step / steps));
      if (step >= steps) {
        clearFade();
        audio.volume = target;
      }
    }, stepMs);
  }

  function waitForMusicReady() {
    if (heroMusic.readyState >= 2) return Promise.resolve();
    return new Promise((resolve) => {
      const finish = () => {
        heroMusic.removeEventListener('canplaythrough', finish);
        heroMusic.removeEventListener('canplay', finish);
        heroMusic.removeEventListener('error', onError);
        resolve();
      };
      const onError = () => {
        heroMusic.removeEventListener('canplaythrough', finish);
        heroMusic.removeEventListener('canplay', finish);
        heroMusic.removeEventListener('error', onError);
        resolve();
      };
      heroMusic.addEventListener('canplaythrough', finish, { once: true });
      heroMusic.addEventListener('canplay', finish, { once: true });
      heroMusic.addEventListener('error', onError, { once: true });
      window.setTimeout(finish, 3000);
    });
  }

  async function playHeroMusicFromStart() {
    if (!shouldPlayMusic()) return false;

    try {
      clearFade();
      heroMusic.pause();
      heroMusic.currentTime = 0;
      heroMusic.volume = 0;
      await waitForMusicReady();

      heroMusic.muted = true;
      await heroMusic.play();
      heroMusic.muted = false;
      musicAudible = true;
      fadeVolume(heroMusic, MUSIC_VOLUME);
      clearMusicRetries();
      return true;
    } catch {
      musicAudible = false;
      return false;
    }
  }

  function stopHeroMusicHard() {
    clearFade();
    clearMusicRetries();
    heroMusic.pause();
    heroMusic.volume = 0;
    heroMusic.currentTime = 0;
    musicAudible = false;
  }

  function pauseHeroMusic() {
    clearFade();
    clearMusicRetries();
    heroMusic.pause();
    heroMusic.volume = 0;
    musicAudible = false;
  }

  async function syncHeroMusic() {
    if (!shouldPlayMusic()) {
      pauseHeroMusic();
      return;
    }
    if (musicAudible && !heroMusic.paused && heroMusic.volume > 0.02) return;
    await playHeroMusicFromStart();
  }

  function scheduleMusicRetries() {
    if (!shouldPlayMusic()) return;
    clearMusicRetries();
    let attempts = 0;
    musicRetryTimer = window.setInterval(async () => {
      attempts += 1;
      refreshHeroVisibility();
      if (!shouldPlayMusic() || attempts > MUSIC_RETRY_MAX) {
        clearMusicRetries();
        if (!shouldPlayMusic()) pauseHeroMusic();
        return;
      }
      if (musicAudible && !heroMusic.paused && heroMusic.volume > 0.02) {
        clearMusicRetries();
        return;
      }
      await playHeroMusicFromStart();
    }, MUSIC_RETRY_MS);
  }

  function bindMusicUnlock() {
    const tryStart = () => {
      refreshHeroVisibility();
      if (!shouldPlayMusic()) {
        pauseHeroMusic();
        return;
      }
      if (!musicAudible || heroMusic.paused) {
        playHeroMusicFromStart();
      }
    };

    ['pointerdown', 'touchstart', 'keydown'].forEach((eventName) => {
      document.addEventListener(eventName, tryStart, { capture: true, passive: true });
    });
  }

  function bindVideoMusicSync(video) {
    video.addEventListener('playing', () => {
      refreshHeroVisibility();
      if (!shouldPlayMusic()) return;
      syncHeroMusic();
    });
  }

  function pauseHeroPlayback() {
    pauseHeroMusic();
    videoSlots?.forEach((v) => {
      if (!v.paused) v.pause();
    });
  }

  async function resumeHeroPlayback() {
    if (!heroReady || !heroPlaying || !heroInView || !videoSlots) return;
    const current = videoSlots[activeSlot];
    const played = await playVideo(current);
    if (played) {
      await syncHeroMusic();
      if (!musicAudible) scheduleMusicRetries();
    }
  }

  function mountHeroVisibility(hero) {
    heroObserver = new IntersectionObserver(() => {
      refreshHeroVisibility();
    }, { threshold: [0, 0.15, 0.35, 0.55, 0.75, 1] });

    heroObserver.observe(hero);
  }

  function bindScrollVisibility() {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!heroReady || ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        refreshHeroVisibility();
      });
    }, { passive: true });
  }

  function isHomepageLink(href) {
    const path = href.split('?')[0].split('#')[0];
    return !path
      || path === 'index.html'
      || path === '/'
      || path === './'
      || path.endsWith('/');
  }

  function bindLeavePageHandlers() {
    const stopAll = () => {
      heroReady = false;
      heroPlaying = false;
      heroInView = false;
      stopHeroMusicHard();
      if (rotateTimer) window.clearInterval(rotateTimer);
      heroObserver?.disconnect();
      videoSlots?.forEach((v) => v.pause());
    };

    window.addEventListener('pagehide', stopAll);
    window.addEventListener('beforeunload', stopAll);

    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      if (isHomepageLink(href)) return;
      stopAll();
    }, true);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pauseHeroPlayback();
      else refreshHeroVisibility();
    });
  }

  function loadSource(video, poster, src) {
    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => resolve(false), LOAD_TIMEOUT_MS);
      const cleanup = () => {
        window.clearTimeout(timeout);
        video.removeEventListener('canplaythrough', onReady);
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('error', onError);
      };
      const onReady = () => {
        cleanup();
        resolve(true);
      };
      const onError = () => {
        cleanup();
        resolve(false);
      };
      video.addEventListener('canplaythrough', onReady, { once: true });
      video.addEventListener('canplay', onReady, { once: true });
      video.addEventListener('error', onError, { once: true });
      video.muted = true;
      video.setAttribute('muted', '');
      video.playsInline = true;
      video.poster = poster;
      video.src = src;
      video.load();
    });
  }

  async function loadClip(video, clip) {
    return loadSource(video, clip.poster, clip.mp4);
  }

  async function playVideo(video) {
    try {
      await video.play();
      return true;
    } catch {
      return false;
    }
  }

  function showPosterFallback() {
    heroPlaying = false;
    heroReady = false;
    stopHeroMusicHard();
    const poster = document.querySelector('[data-hero-poster]');
    const videos = document.querySelectorAll('.hero-video__clip');
    videos.forEach((v) => { v.style.display = 'none'; });
    if (poster) {
      poster.src = CLIPS[0].poster;
      poster.style.display = 'block';
    }
    animateHeroText();
  }

  async function initHeroVideoPlayer() {
    heroSection = document.querySelector('.hero-video');
    const videoA = document.getElementById('heroVideoA');
    const videoB = document.getElementById('heroVideoB');
    if (!heroSection || !videoA || !videoB) return;

    bindLeavePageHandlers();
    bindMusicUnlock();
    bindScrollVisibility();
    bindVideoMusicSync(videoA);
    bindVideoMusicSync(videoB);

    if (prefersReduced || slowConnection) {
      showPosterFallback();
      return;
    }

    videoSlots = [videoA, videoB];
    let started = false;
    for (let i = 0; i < CLIPS.length; i += 1) {
      const ok = await loadClip(videoSlots[0], CLIPS[i]);
      if (!ok) continue;
      const played = await playVideo(videoSlots[0]);
      if (played) {
        clipIndex = (i + 1) % CLIPS.length;
        started = true;
        break;
      }
    }

    if (!started) {
      showPosterFallback();
      return;
    }

    videoSlots[0].classList.add('hero-video__clip--active');
    animateHeroText();
    heroSection.classList.add('hero-video--playing');
    heroPlaying = true;
    heroReady = true;

    mountHeroVisibility(heroSection);
    refreshHeroVisibility();

    if (heroInView) {
      await syncHeroMusic();
      if (!musicAudible) scheduleMusicRetries();
    }

    clipIndex = clipIndex || 1;
    rotateTimer = window.setInterval(() => rotateClip(videoSlots), ROTATE_MS);

    async function rotateClip(videos) {
      if (!heroInView) return;

      const nextClip = CLIPS[clipIndex % CLIPS.length];
      const current = videos[activeSlot];
      const next = videos[1 - activeSlot];

      const ok = await loadClip(next, nextClip);
      if (!ok) {
        clipIndex += 1;
        return;
      }

      const playedNext = await playVideo(next);
      if (!playedNext) {
        clipIndex += 1;
        return;
      }

      next.classList.add('hero-video__clip--active');
      current.classList.remove('hero-video__clip--active');
      current.pause();
      current.removeAttribute('src');
      current.load();

      activeSlot = 1 - activeSlot;
      clipIndex += 1;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroVideoPlayer);
  } else {
    initHeroVideoPlayer();
  }
})();
