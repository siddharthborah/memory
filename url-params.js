// Handle URL parameters for test and debug modes
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Show test controls if test=true
    if (urlParams.get('test') === 'true') {
        const testControls = document.getElementById('testControls');
        if (testControls) {
            testControls.style.display = 'block';
        }
    }
    
    // Show debug panel if debug=true
    if (urlParams.get('debug') === 'true') {
        const debugPanel = document.getElementById('debugPanel');
        if (debugPanel) {
            debugPanel.style.display = 'block';
        }
    }
}); 