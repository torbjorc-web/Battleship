(() => {
  'use strict';

  let intervalId = null;
  let remainingSeconds = 0;

  function stop() {
    if (intervalId !== null) window.clearInterval(intervalId);
    intervalId = null;
    remainingSeconds = 0;
  }

  function start(seconds, onTick, onExpire) {
    stop();
    const duration = Number(seconds);
    if (!Number.isFinite(duration) || duration <= 0) return false;
    remainingSeconds = Math.floor(duration);
    onTick(remainingSeconds);
    intervalId = window.setInterval(() => {
      remainingSeconds -= 1;
      if (remainingSeconds <= 0) {
        stop();
        onTick(0);
        onExpire();
        return;
      }
      onTick(remainingSeconds);
    }, 1000);
    return true;
  }

  window.BattleshipTimer = {
    start,
    stop,
    remaining: () => remainingSeconds,
    isRunning: () => intervalId !== null
  };
})();
