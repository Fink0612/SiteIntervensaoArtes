(() => {
  const watchZone = document.querySelector('.watch-zone');
  const eye = document.querySelector('.eye');
  const status = document.querySelector('.tracking-status');
  const sensorButton = document.querySelector('.sensor-button');
  const prompt = document.querySelector('.activation-prompt');
  const signal = document.querySelector('.signal');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!watchZone || !eye || !status || !sensorButton || reducedMotion) return;

  let gyroscopeOn = false;
  let trackingUnlocked = true;
  let activationStep = 0;
  let isIdle = false;
  let idleTimer;
  let lastX = 0;
  let lastY = 0;

  const setGaze = (x, y) => {
    const limit = Math.max(12, Math.round(watchZone.clientWidth * 0.055));
    lastX = Math.max(-limit, Math.min(limit, x));
    lastY = Math.max(-limit, Math.min(limit, y));
    watchZone.style.setProperty('--iris-x', `${lastX}px`);
    watchZone.style.setProperty('--iris-y', `${lastY}px`);
    // O globo inteiro acompanha o gesto; a íris faz apenas o ajuste mais preciso.
    watchZone.style.setProperty('--eye-x', `${(lastX * 0.34).toFixed(1)}px`);
    watchZone.style.setProperty('--eye-y', `${(lastY * 0.34).toFixed(1)}px`);
    watchZone.style.setProperty('--eye-turn', `${(lastX * 0.22).toFixed(2)}deg`);
  };

  const resetIdle = () => {
    if (gyroscopeOn || !trackingUnlocked) return;
    clearTimeout(idleTimer);
    if (isIdle) {
      isIdle = false;
      watchZone.classList.remove('is-idle');
      status.textContent = 'RASTREAMENTO: CURSOR';
    }
    idleTimer = window.setTimeout(() => {
      isIdle = true;
      watchZone.classList.add('is-idle');
      status.textContent = 'RASTREAMENTO: PROCURANDO...';
    }, 2400);
  };

  const scheduleBlink = () => {
    const nextBlink = 2600 + Math.random() * 4200;
    window.setTimeout(() => {
      if (!watchZone.classList.contains('is-asleep') && !watchZone.classList.contains('is-interfering')) {
        watchZone.classList.add('is-blinking');
        window.setTimeout(() => watchZone.classList.remove('is-blinking'), 460);
      }
      scheduleBlink();
    }, nextBlink);
  };

  // 1. No computador, a íris acompanha a posição do cursor.
  window.addEventListener('pointermove', (event) => {
    if (!trackingUnlocked || gyroscopeOn || event.pointerType === 'touch') return;
    const rect = watchZone.getBoundingClientRect();
    const x = ((event.clientX - (rect.left + rect.width / 2)) / rect.width) * 38;
    const y = ((event.clientY - (rect.top + rect.height / 2)) / rect.height) * 38;
    setGaze(x, y);
    resetIdle();
  }, { passive: true });

  const interfere = () => {
    watchZone.classList.remove('is-interfering');
    document.body.classList.remove('has-interference');
    void watchZone.offsetWidth;
    watchZone.classList.add('is-interfering');
    document.body.classList.add('has-interference');
    status.textContent = 'INTERFERÊNCIA DETECTADA';
    signal.classList.add('signal-glitch');
    window.setTimeout(() => {
      watchZone.classList.remove('is-interfering');
      document.body.classList.remove('has-interference');
      signal.classList.remove('signal-glitch');
      status.textContent = gyroscopeOn ? 'RASTREAMENTO: MOVIMENTO' : (trackingUnlocked ? 'RASTREAMENTO: CURSOR' : 'SINAL EM ESPERA');
    }, 900);
  };

  // 2. Toque/clique no olho provoca uma piscada e um flash de "câmera".
  eye.addEventListener('click', interfere);
  eye.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      interfere();
    }
  });

  // 3. A experiência só libera o olhar depois de uma segunda confirmação.
  const activateExperience = async () => {
    if (activationStep === 0) {
      activationStep = 1;
      watchZone.classList.add('is-arming');
      prompt.textContent = 'VOCÊ TEM CERTEZA QUE QUER SER OBSERVADO?';
      sensorButton.textContent = 'CLIQUE NOVAMENTE';
      status.textContent = 'AGUARDANDO CONFIRMAÇÃO';
      return;
    }

    try {
      const hasGyroscope = typeof DeviceOrientationEvent !== 'undefined';
      if (hasGyroscope && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') throw new Error('permission denied');
      }
      trackingUnlocked = true;
      gyroscopeOn = hasGyroscope && window.matchMedia('(pointer: coarse)').matches;
      clearTimeout(idleTimer);
      watchZone.classList.remove('is-idle');
      watchZone.classList.remove('is-arming');
      watchZone.classList.toggle('is-gyro', gyroscopeOn);
      watchZone.classList.add('is-active');
      sensorButton.textContent = 'O OLHAR SEGUE VOCÊ';
      sensorButton.setAttribute('aria-pressed', 'true');
      status.textContent = gyroscopeOn ? 'RASTREAMENTO: MOVIMENTO' : 'RASTREAMENTO: CURSOR';
      prompt.textContent = 'SINAL ESTABELECIDO';
      window.setTimeout(() => watchZone.classList.remove('is-active'), 1100);
    } catch {
      status.textContent = 'PERMISSÃO NEGADA';
    }
  };

  sensorButton.addEventListener('click', activateExperience);
  window.addEventListener('deviceorientation', (event) => {
    // Android e alguns navegadores liberam o sensor automaticamente. O Safari/iOS
    // exige o segundo clique no botão antes de chegar aqui com permissão.
    if (!gyroscopeOn && trackingUnlocked && window.matchMedia('(pointer: coarse)').matches && typeof DeviceOrientationEvent.requestPermission !== 'function') {
      gyroscopeOn = true;
      watchZone.classList.add('is-gyro');
      sensorButton.textContent = 'O OLHAR SEGUE VOCÊ';
      sensorButton.setAttribute('aria-pressed', 'true');
      status.textContent = 'RASTREAMENTO: MOVIMENTO';
    }
    if (!gyroscopeOn) return;
    const angle = screen.orientation?.angle || window.orientation || 0;
    const sideways = Math.abs(angle) === 90;
    const x = sideways ? (event.beta || 0) : (event.gamma || 0);
    const y = sideways ? (event.gamma || 0) : (event.beta || 0);
    setGaze(x * 0.72, y * 0.52);
  }, { passive: true });

  // 4. Pisca espontaneamente para tornar a vigilância mais presente.
  // 5. Após alguns segundos sem cursor, ele procura sozinho pelo visitante.
  resetIdle();
  scheduleBlink();

  // Contador artístico: reage ao percurso, sem registrar informação real.
  const counter = document.querySelector('.counter strong');
  const updateCounter = () => {
    if (!counter) return;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const signals = 127 + Math.floor((window.scrollY / maxScroll) * 873);
    counter.textContent = `#${String(signals).padStart(6, '0')}`;
  };
  window.addEventListener('scroll', updateCounter, { passive: true });
  updateCounter();

  const toast = document.createElement('div');
  toast.className = 'data-toast';
  toast.setAttribute('aria-live', 'polite');
  document.body.append(toast);
  let toastTimer;
  const announce = (message) => {
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2300);
  };

  // Frases escondidas nos rastros: a coleta é fictícia, a provocação não.
  document.querySelectorAll('.trace-card').forEach((card, index) => {
    const messages = ['LOCALIZAÇÃO CRUZADA COM ROTINA.', 'DESEJOS TRANSFORMADOS EM PERFIL.', 'ROSTO NÃO É SENHA. É DADO.', 'ATENÇÃO TAMBÉM DEIXA RASTRO.'];
    card.addEventListener('click', () => announce(messages[index]));
  });

  // Paisagem sonora opcional, gerada no próprio navegador.
  const soundButton = document.querySelector('.sound-button');
  let audioContext;
  let soundTimer;
  const surveillanceBeep = () => {
    if (!audioContext || audioContext.state !== 'running') return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = 820 + Math.random() * 380;
    gain.gain.setValueAtTime(.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.025, audioContext.currentTime + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .09);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + .1);
  };
  soundButton?.addEventListener('click', async () => {
    if (!audioContext) {
      const AudioConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioConstructor) {
        announce('SOM NÃO DISPONÍVEL NESTE NAVEGADOR.');
        return;
      }
      audioContext = new AudioConstructor();
    }
    const enabled = soundButton.getAttribute('aria-pressed') !== 'true';
    if (enabled) {
      await audioContext.resume();
      soundButton.setAttribute('aria-pressed', 'true');
      soundButton.textContent = 'SOM: SINAL ATIVO';
      surveillanceBeep();
      soundTimer = window.setInterval(surveillanceBeep, 4800);
    } else {
      clearInterval(soundTimer);
      await audioContext.suspend();
      soundButton.setAttribute('aria-pressed', 'false');
      soundButton.textContent = 'SOM: DESLIGADO';
    }
  });

  // Simulador de consentimento: cada escolha é reversível e acontece localmente.
  const options = [...document.querySelectorAll('.consent-option')];
  const consentResult = document.querySelector('.consent-result');
  options.forEach((option) => option.addEventListener('click', () => {
    const accepted = option.getAttribute('aria-pressed') !== 'true';
    option.setAttribute('aria-pressed', String(accepted));
    const selected = options.filter((item) => item.getAttribute('aria-pressed') === 'true').map((item) => item.dataset.choice);
    consentResult.textContent = selected.length
      ? `${selected.length} PERMISS${selected.length === 1 ? 'ÃO' : 'ÕES'} SIMULADA${selected.length === 1 ? '' : 'S'}: ${selected.join(', ').toUpperCase()}.`
      : 'NENHUMA PERMISSÃO ACEITA. A ESCOLHA TAMBÉM É UMA RESPOSTA.';
  }));

  // Espelho: a stream nunca sai do dispositivo e é encerrada ao fechar.
  const mirrorButton = document.querySelector('.mirror-button');
  const mirrorVideo = document.querySelector('.mirror-video');
  let mirrorStream;
  mirrorButton?.addEventListener('click', async () => {
    if (mirrorStream) {
      mirrorStream.getTracks().forEach((track) => track.stop());
      mirrorStream = null;
      mirrorVideo.srcObject = null;
      mirrorVideo.classList.remove('is-on');
      mirrorButton.textContent = 'ENTRAR NO CAMPO DE VISÃO';
      return;
    }
    try {
      mirrorStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      mirrorVideo.srcObject = mirrorStream;
      mirrorVideo.classList.add('is-on');
      mirrorButton.textContent = 'SAIR DO CAMPO DE VISÃO';
    } catch {
      announce('CÂMERA NÃO LIBERADA. NADA FOI GRAVADO.');
    }
  });

  // Cartaz final para salvar: gerado em canvas, sem upload ou coleta.
  document.querySelector('.share-button')?.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 630;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#101010'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(1015, 310, 155, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#d7ff35'; ctx.font = '700 36px monospace'; ctx.fillText('SEMPRE OBSERVADOS', 74, 95);
    ctx.fillStyle = '#f0eee7'; ctx.font = '900 130px Impact, sans-serif'; ctx.fillText('EU OLHEI', 74, 280); ctx.fillText('DE VOLTA.', 74, 410);
    ctx.fillStyle = '#ff3b30'; ctx.font = '700 27px monospace'; ctx.fillText('INTERVENÇÃO ARTÍSTICA SOBRE PRIVACIDADE', 76, 520);
    const link = document.createElement('a');
    link.download = 'eu-olhei-de-volta.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    announce('CARTAZ GERADO NO SEU DISPOSITIVO.');
  });
})();
