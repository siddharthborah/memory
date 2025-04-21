document.addEventListener('DOMContentLoaded', function() {
    const savePageButton = document.getElementById('savePage');
    const viewSavedButton = document.getElementById('viewSaved');
    const savedPagesDiv = document.getElementById('savedPages');

    savePageButton.addEventListener('click', function() {
        chrome.runtime.sendMessage({action: "savePage"}, function(response) {
            if (response && response.success) {
                alert('Page saved successfully!');
            } else {
                alert('Failed to save page. Please try again.');
            }
        });
    });

    viewSavedButton.addEventListener('click', function() {
        chrome.runtime.openOptionsPage();
    });
}); 