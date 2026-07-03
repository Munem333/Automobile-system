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
  const MUSIC_VOLUME = 0.14;
  const MUSIC_FADE_MS = 1600;
  const HERO_VISIBLE_RATIO = 0.45;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slowConnection = navigator.connection?.saveData
    || (navigator.connection?.effectiveType || '').includes('2g');

  let clipIndex = 0;
  let activeSlot = 0;
  let rotateTimer = null;
  let heroPlaying = false;
  let heroInView = false;
  let musicSessionStarted = false;
  let videoSlots = null;

  const heroMusic = new Audio();
  let fadeTimer = null;
  let heroObserver = null;

  heroMusic.loop = true;
  heroMusic.preload = 'auto';
  heroMusic.volume = 0;
  heroMusic.src = MUSIC_TRACK;

  function animateHeroText() {
    document.querySelector('.hero-video__eyebrow')?.classList.add('anim-in');
    document.querySelector('.hero-video__headline')?.classList.add('anim-in');
    document.querySelector('.hero-video__cta')?.classList.add('anim-in');
  }

  function shouldPlayMusic() {
    return heroPlaying && heroInView && !prefersReduced;
  }

  function clearFade() {
    if (fadeTimer) {
      window.clearInterval(fadeTimer);
      fadeTimer = null;
    }
  }

  function fadeVolume(audio, target, done) {
    clearFade();
    const from = audio.volume;
    const steps = 24;
    const stepMs = MUSIC_FADE_MS / steps;
    let step = 0;
    fadeTimer = window.setInterval(() => {
      step += 1;
      audio.volume = from + ((target - from) * (step / steps));
      if (step >= steps) {
        clearFade();
        audio.volume = target;
        done?.();
      }
    }, stepMs);
  }

  async function startHeroMusicSession() {
    if (!shouldPlayMusic()) return false;
    if (musicSessionStarted && !heroMusic.paused) return true;
    try {
      if (!musicSessionStarted) {
        heroMusic.currentTime = 0;
        musicSessionStarted = true;
      }
      await heroMusic.play();
      fadeVolume(heroMusic, MUSIC_VOLUME);
      return true;
    } catch {
      return false;
    }
  }

  function pauseHeroMusic() {
    clearFade();
    if (!heroMusic.paused) {
      const vol = heroMusic.volume;
      fadeVolume(heroMusic, 0, () => {
        heroMusic.pause();
        heroMusic.volume = vol;
      });
    }
  }

  async function resumeHeroMusic() {
    if (!shouldPlayMusic()) return;
    if (!musicSessionStarted) {
      await startHeroMusicSession();
      return;
    }
    try {
      await heroMusic.play();
      fadeVolume(heroMusic, MUSIC_VOLUME);
    } catch {
      /* browser may block until user gesture */
    }
  }

  function stopHeroMusic() {
    clearFade();
    heroMusic.pause();
    heroMusic.volume = 0;
    heroMusic.currentTime = 0;
    musicSessionStarted = false;
  }

  async function syncHeroMusic() {
    if (!shouldPlayMusic()) {
      pauseHeroMusic();
      return;
    }
    if (musicSessionStarted) await resumeHeroMusic();
    else await startHeroMusicSession();
  }

  function bindAutoMusicUnlock() {
    const unlock = () => syncHeroMusic();
    document.addEventListener('pointerdown', unlock, { once: true, capture: true });
    document.addEventListener('keydown', unlock, { once: true, capture: true });
    window.addEventListener('scroll', unlock, { once: true, passive: true });
  }

  function pauseHeroPlayback() {
    pauseHeroMusic();
    videoSlots?.forEach((v) => {
      if (!v.paused) v.pause();
    });
  }

  async function resumeHeroPlayback() {
    if (!heroPlaying || !heroInView || !videoSlots) return;
    const current = videoSlots[activeSlot];
    await playVideo(current);
    await syncHeroMusic();
  }

  function mountHeroVisibility(hero) {
    heroObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      const visible = entry.isIntersecting && entry.intersectionRatio >= HERO_VISIBLE_RATIO;
      heroInView = visible;
      if (visible) resumeHeroPlayback();
      else pauseHeroPlayback();
    }, { threshold: [0, 0.25, 0.45, 0.6, 0.85, 1] });

    heroObserver.observe(hero);
  }

  function bindLeavePageHandlers() {
    const stopAll = () => {
      stopHeroMusic();
      if (rotateTimer) window.clearInterval(rotateTimer);
      heroObserver?.disconnect();
    };

    window.addEventListener('pagehide', stopAll);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pauseHeroPlayback();
      else if (heroInView) resumeHeroPlayback();
    });

    document.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      if (href === 'index.html' || href === '/' || href === './') return;
      link.addEventListener('click', stopAll);
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
    stopHeroMusic();
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
    const hero = document.querySelector('.hero-video');
    const videoA = document.getElementById('heroVideoA');
    const videoB = document.getElementById('heroVideoB');
    if (!hero || !videoA || !videoB) return;

    mountHeroVisibility(hero);
    bindLeavePageHandlers();
    bindAutoMusicUnlock();

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
    hero.classList.add('hero-video--playing');
    heroPlaying = true;
    heroInView = true;

    await syncHeroMusic();

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

  document.addEventListener('DOMContentLoaded', initHeroVideoPlayer);
})();
