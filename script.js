const canvas = document.getElementById('timeline');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('timeline-tooltip');
const activeTimerElement = document.getElementById('active-timer');

// Timeline and session tracking
let timeline = [];
let activeSession = null;
let activeTimerInterval = null;

// Function to load session logs from localStorage
function loadSessionLogs() {
  const logs = localStorage.getItem('sessionLogs');
  return logs ? JSON.parse(logs) : [];
}

// Function to save session logs to localStorage
function saveSessionLogs(sessionLogs) {
  localStorage.setItem('sessionLogs', JSON.stringify(sessionLogs));
}

// Compute stats from session logs
function computeStats() {
  const stats = { focused: [], distracted: [], rest: [] };

  const sessionLogs = loadSessionLogs();
  sessionLogs.forEach(({ type, duration }) => {
    stats[type].push(duration);
  });

  const summarize = (durations) => ({
    total: durations.length,
    min: durations.length ? Math.min(...durations) : 0,
    max: durations.length ? Math.max(...durations) : 0,
    avg: durations.length ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2) : 0,
  });

  return {
    focused: summarize(stats.focused),
    distracted: summarize(stats.distracted),
    rest: summarize(stats.rest),
  };
}

// Example: Display stats at the end of the day
function showStats() {
  const stats = computeStats();
  console.log("Session Statistics:", stats);

  // Example output
  alert(`Today's Session Stats:
    Focused - Total: ${stats.focused.total}, Min: ${stats.focused.min}s, Max: ${stats.focused.max}s, Avg: ${stats.focused.avg}s
    Distracted - Total: ${stats.distracted.total}, Min: ${stats.distracted.min}s, Max: ${stats.distracted.max}s, Avg: ${stats.distracted.avg}s
    Rest - Total: ${stats.rest.total}, Min: ${stats.rest.min}s, Max: ${stats.rest.max}s, Avg: ${stats.rest.avg}s
  `);
}


// Function to format time in HH:MM:SS
function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Function to start a new session
function startSession(type) {
  const now = Date.now();

  // End the active session if it exists
  if (activeSession) {
    activeSession.endTime = now;
    logSession(activeSession.type, activeSession.startTime, activeSession.endTime); // Log session
    timeline.push(activeSession);
  }

  // Start a new session
  activeSession = { type, startTime: now, endTime: null };
  
  // Update mode indicator and timer styling
  const timerContainer = document.getElementById('timer-container');
  const modeIndicator = document.getElementById('mode-indicator');

  timerContainer.className = `${type}-mode`;
  modeIndicator.textContent = type.charAt(0).toUpperCase() + type.slice(1) + ' Mode';
  
  // Reset and start the active timer
  if (activeTimerInterval) clearInterval(activeTimerInterval);
  activeTimerInterval = setInterval(() => {
    const elapsedTime = Date.now() - activeSession.startTime;
    activeTimerElement.textContent = formatTime(elapsedTime);
  }, 1000);

  updateTimeline();
}

// Stop the timer when switching sessions or ending the active session
function stopActiveTimer() {
  if (activeTimerInterval) clearInterval(activeTimerInterval);
  document.getElementById('active-timer').textContent = '00:00:00'; // Reset display
  document.getElementById('mode-indicator').textContent = ''; // Clear mode label
  document.getElementById('timer-container').className = ''; // Remove styling
}

// Function to update the timeline visualization
function updateTimeline() {
  const totalWidth = canvas.width;
  const totalDuration = timeline.reduce((sum, session) => sum + (session.endTime - session.startTime), 0);
  const currentTime = Date.now();

  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

  let x = 0; // Start drawing from the left
  timeline.forEach((session, index) => {
    const sessionDuration = session.endTime - session.startTime;
    const width = (sessionDuration / totalDuration) * totalWidth;

    // Style and draw the session block
    const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
    gradient.addColorStop(0, session.type === 'focused' ? '#9de79e' : session.type === 'distracted' ? '#e79d9d' : '#9dc9e7');
    gradient.addColorStop(1, session.type === 'focused' ? '#68c568' : session.type === 'distracted' ? '#c56868' : '#68a1c5');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, 10, width, 60);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.strokeRect(x, 10, width, 60);

    // Store block position for interaction
    session._block = { x, width, index };

    x += width; // Move to the next position
  });

  // Show active session
  if (activeSession) {
    const sessionDuration = currentTime - activeSession.startTime;
    const width = (sessionDuration / (totalDuration + sessionDuration)) * totalWidth;

    ctx.fillStyle = activeSession.type === 'focused' ? '#9de79e' : activeSession.type === 'distracted' ? '#e79d9d' : '#9dc9e7';
    ctx.fillRect(x, 10, width, 60);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.strokeRect(x, 10, width, 60);
  }
}

// Function to log a completed session and store in localStorage
function logSession(type, startTime, endTime) {
  const duration = (endTime - startTime) / 1000; // Convert ms to seconds
  const sessionLogs = loadSessionLogs();
  sessionLogs.push({ type, startTime, endTime, duration });
  saveSessionLogs(sessionLogs); // Store updated logs back to localStorage
}

// Function to generate CSV file from session logs
function generateCSV(sessionLogs) {
  const headers = ['Type', 'Start Time', 'End Time', 'Duration (seconds)'];
  const rows = sessionLogs.map(log => [
    log.type,
    new Date(log.startTime).toLocaleString(),
    new Date(log.endTime).toLocaleString(),
    log.duration
  ]);

  // Create CSV content
  let csvContent = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n';
  rows.forEach(row => {
    csvContent += row.join(',') + '\n';
  });

  // Create a link to download the CSV file
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'session_logs.csv');
  link.click(); // Trigger download
}

// Function to call at the end of the day or to download logs
function downloadSessionLogs() {
  const sessionLogs = loadSessionLogs();
  generateCSV(sessionLogs);
}





// Event listener for interactive tooltip
canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  const session = timeline.find(
    (s) => mouseX >= s._block.x && mouseX <= s._block.x + s._block.width
  );

  if (session && mouseY >= 10 && mouseY <= 70) {
    const startTime = new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const durationMinutes = Math.floor((session.endTime - session.startTime) / 1000 / 60);

    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;
    tooltip.style.display = 'block';
    tooltip.innerHTML = `
      <strong>${session.type.charAt(0).toUpperCase() + session.type.slice(1)} Mode</strong><br>
      Start: ${startTime}<br>
      End: ${endTime}<br>
      Duration: ${durationMinutes} mins
    `;
  } else {
    tooltip.style.display = 'none';
  }
});
