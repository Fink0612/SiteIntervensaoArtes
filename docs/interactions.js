(() => {
  const watchZone = document.querySelector('.watch-zone');
  const eye = document.querySelector('.eye');
  const status = document.querySelector('.tracking-status');
  const sensorButton = document.querySelector('.sensor-button');
  const signal = document.querySelector('.signal');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!watchZone || !eye || !status || !sensorButton || reducedMotion) return;

  let gyroscopeOn = false;
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
  };

  const resetIdle = () => {
    if (gyroscopeOn) return;
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

  // 1. No computador, a íris acompanha a posição do cursor.
  window.addEventListener('pointermove', (event) => {
    if (gyroscopeOn || event.pointerType === 'touch') return;
    const rect = watchZone.getBoundingClientRect();
    const x = ((event.clientX - (rect.left + rect.width / 2)) / rect.width) * 38;
    const y = ((event.clientY - (rect.top + rect.height / 2)) / rect.height) * 38;
    setGaze(x, y);
    resetIdle();
  }, { passive: true });

  window.addEventListener('blur', () => {
    watchZone.classList.add('is-asleep');
    status.textContent = 'SINAL PERDIDO';
  });
  window.addEventListener('focus', () => {
    watchZone.classList.remove('is-asleep');
    status.textContent = gyroscopeOn ? 'RASTREAMENTO: MOVIMENTO' : 'RASTREAMENTO: CURSOR';
  });

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
      status.textContent = gyroscopeOn ? 'RASTREAMENTO: MOVIMENTO' : 'RASTREAMENTO: CURSOR';
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

  // 3. No celular, o botão habilita o giroscópio (inclusive no Safari/iOS).
  const startGyroscope = async () => {
    try {
      if (typeof DeviceOrientationEvent === 'undefined') {
        status.textContent = 'SENSOR INDISPONÍVEL';
        return;
      }
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') throw new Error('permission denied');
      }
      gyroscopeOn = true;
      clearTimeout(idleTimer);
      watchZone.classList.remove('is-idle');
      watchZone.classList.add('is-gyro');
      sensorButton.textContent = 'O OLHAR SEGUE VOCÊ';
      sensorButton.setAttribute('aria-pressed', 'true');
      status.textContent = 'RASTREAMENTO: MOVIMENTO';
    } catch {
      status.textContent = 'PERMISSÃO NEGADA';
    }
  };

  sensorButton.addEventListener('click', startGyroscope);
  window.addEventListener('deviceorientation', (event) => {
    if (!gyroscopeOn) return;
    const angle = screen.orientation?.angle || window.orientation || 0;
    const sideways = Math.abs(angle) === 90;
    const x = sideways ? (event.beta || 0) : (event.gamma || 0);
    const y = sideways ? (event.gamma || 0) : (event.beta || 0);
    setGaze(x * 0.72, y * 0.52);
  }, { passive: true });

  // 4. Ao sair do site e voltar, o olho fecha como se tivesse sido pego observando.
  // 5. Após alguns segundos sem cursor, ele procura sozinho pelo visitante.
  resetIdle();
})();
