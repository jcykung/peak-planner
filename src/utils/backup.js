export function exportBackupJSON(wishlist) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(wishlist, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "peakplanner_wishlist_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

export function importBackupJSONFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const parsed = JSON.parse(e.target.result);
                if (typeof parsed === 'object' && parsed !== null) {
                    resolve(parsed);
                } else {
                    reject(new Error("Invalid backup file structure."));
                }
            } catch (err) {
                reject(new Error("Failed to parse JSON backup file."));
            }
        };
        reader.onerror = () => reject(new Error("Error reading backup file."));
        reader.readAsText(file);
    });
}
