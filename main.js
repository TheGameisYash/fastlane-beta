import { db } from './firebase.js';
import { getDocs, collection, addDoc, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

// DOM Elements
const reportForm = document.getElementById('reportForm');
const reportTable = document.querySelector("#reportTable tbody");
const calculatedCost = document.getElementById('calculatedCost');
const totalRepairsEl = document.getElementById("totalRepairs");
const totalCostEl = document.getElementById("totalCost");
const employeeFilter = document.getElementById("employeeFilter");
const statTotalRepairs = document.getElementById("statTotalRepairs");
const statTotalCost = document.getElementById("statTotalCost");
const statApprovalRate = document.getElementById("statApprovalRate");

// UI Helper Functions
function showLoading(element) {
    element.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i></div>';
}

function showNotification(message, type = "info") {
    // Check if notification already exists and remove it
    const existingNotification = document.querySelector(".notification");
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    // Add notification to DOM
    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.add("hide");
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add this CSS for notifications and loading spinner to the document
document.addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            background-color: var(--card-bg);
            color: var(--text-color);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            animation: slideIn 0.3s ease-out forwards;
            max-width: 350px;
        }
        
        .notification-content {
            display: flex;
            align-items: center;
        }
        
        .notification-content i {
            margin-right: 10px;
            font-size: 18px;
        }
        
        .notification.success {
            border-left: 4px solid var(--success);
        }
        
        .notification.success i {
            color: var(--success);
        }
        
        .notification.error {
            border-left: 4px solid var(--danger);
        }
        
        .notification.error i {
            color: var(--danger);
        }
        
        .notification.info {
            border-left: 4px solid var(--accent);
        }
        
        .notification.info i {
            color: var(--accent);
        }
        
        .notification.hide {
            animation: slideOut 0.3s ease-in forwards;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .loading-spinner {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            color: var(--accent);
            font-size: 22px;
        }
        
        .fade-in {
            animation: fadeIn 0.5s ease-out forwards;
        }
        
        .pulse {
            animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
            0% {
                opacity: 1;
            }
            50% {
                opacity: 0.6;
            }
            100% {
                opacity: 1;
            }
        }
        
        .stat-value {
            transition: all 0.5s ease-out;
        }
        
        .badge-counter {
            display: inline-block;
            background-color: var(--accent);
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 8px;
        }
        
        .highlight-row {
            animation: highlightRow 2s ease-out;
        }
        
        @keyframes highlightRow {
            0% {
                background-color: rgba(76, 175, 80, 0.2);
            }
            100% {
                background-color: transparent;
            }
        }
    `;
    document.head.appendChild(style);
});

// Submit Report with enhanced UI feedback
reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitButton = reportForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    
    // Change button to loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Submitting...';
    
    try {
        const employee = document.getElementById("employee").value;
        const date = document.getElementById("date").value;
        const repairs = parseInt(document.getElementById("repairs").value);
        const cost = repairs * 700;

        const report = {
            employee,
            date,
            repairs,
            cost,
            approved: false,
            timestamp: new Date().toISOString()
        };

        await addDoc(collection(db, "reports"), report);
        showNotification("Report submitted successfully!", "success");
        reportForm.reset();
        
        // Reset calculated cost
        calculatedCost.textContent = "₹0";
        
        // Load reports with a highlight effect for the new entry
        await loadReports(employeeFilter.value, true);
        await updateStats();
        
    } catch (error) {
        console.error("Error submitting report:", error);
        showNotification("Failed to submit report: " + error.message, "error");
    } finally {
        // Restore button state
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
});

// Enhanced Cost Calculation with animation
document.getElementById('repairs').addEventListener('input', () => {
    const repairs = parseInt(document.getElementById('repairs').value) || 0;
    const cost = repairs * 700;
    
    // Animate cost change
    calculatedCost.classList.add('pulse');
    setTimeout(() => {
        calculatedCost.textContent = `₹${cost}`;
        setTimeout(() => {
            calculatedCost.classList.remove('pulse');
        }, 500);
    }, 200);
});

// Load Reports with enhanced UI feedback
async function loadReports(filterByEmployee = "", highlightNewest = false) {
    try {
        // Show loading state
        reportTable.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading reports...</div></td></tr>';
        
        const snapshot = await getDocs(collection(db, "reports"));
        reportTable.innerHTML = "";
        
        let totalRepairs = 0;
        let totalCost = 0;
        let reports = [];
        
        // Collect all reports and sort by date (newest first)
        snapshot.forEach(docSnap => {
            const report = docSnap.data();
            reports.push(report);
            
            if (filterByEmployee && report.employee !== filterByEmployee) return;
            
            totalRepairs += report.repairs;
            totalCost += report.cost;
        });
        
        // Sort reports by date (newest first)
        reports.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Check if we have reports to display
        if (reports.length === 0) {
            reportTable.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-state-container">
                            <i class="fas fa-clipboard-list empty-icon"></i>
                            <p>No reports found${filterByEmployee ? ' for ' + filterByEmployee : ''}.</p>
                            ${filterByEmployee ? '<p><a href="#" id="clearFilter">Clear filter</a> to see all reports.</p>' : ''}
                        </div>
                    </td>
                </tr>
            `;
            
            // Add event listener for clear filter link
            const clearFilterLink = document.getElementById("clearFilter");
            if (clearFilterLink) {
                clearFilterLink.addEventListener("click", (e) => {
                    e.preventDefault();
                    employeeFilter.value = "";
                    loadReports();
                });
            }
        } else {
            // Display reports with fade-in animation
            let delay = 0;
            reports.forEach((report, index) => {
                if (filterByEmployee && report.employee !== filterByEmployee) return;
                
                const row = document.createElement('tr');
                row.className = 'fade-in';
                row.style.animationDelay = `${delay}ms`;
                
                // Add highlight class to the newest row if requested
                if (highlightNewest && index === 0) {
                    row.classList.add('highlight-row');
                }
                
                row.innerHTML = `
                    <td>${report.employee}</td>
                    <td>${report.date}</td>
                    <td>${report.repairs}</td>
                    <td>₹${report.cost}</td>
                    <td>
                        <span class="status-badge ${report.approved ? 'status-approved' : 'status-pending'}">
                            ${report.approved ? '✔️ Approved' : '⏳ Pending'}
                        </span>
                    </td>
                `;
                reportTable.appendChild(row);
                delay += 50; // Stagger the animations
            });
        }
        
        // Update totals with animation
        animateCounter(totalRepairsEl, totalRepairs);
        animateCounter(totalCostEl, totalCost, true);
        
    } catch (error) {
        console.error("Error loading reports:", error);
        reportTable.innerHTML = `
            <tr>
                <td colspan="5" class="error-state">
                    <div class="error-state-container">
                        <i class="fas fa-exclamation-circle error-icon"></i>
                        <p>Failed to load reports. Please try again.</p>
                        <button class="btn btn-sm btn-primary retry-button">
                            <i class="fas fa-sync-alt"></i> Retry
                        </button>
                    </div>
                </td>
            </tr>
        `;
        
        // Add retry button functionality
        const retryButton = reportTable.querySelector(".retry-button");
        if (retryButton) {
            retryButton.addEventListener("click", () => {
                loadReports(employeeFilter.value);
            });
        }
    }
}

// Animate counter for better UX
function animateCounter(element, targetValue, isCurrency = false) {
    const duration = 1000; // Animation duration in milliseconds
    const startValue = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuad = progress => 1 - (1 - progress) * (1 - progress);
        const easedProgress = easeOutQuad(progress);
        
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easedProgress);
        
        if (isCurrency) {
            element.textContent = `₹${currentValue}`;
        } else {
            element.textContent = currentValue;
        }
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// Update Dashboard Stats
async function updateStats() {
    try {
        // Show loading state
        statTotalRepairs.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
        statTotalCost.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
        statApprovalRate.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
        
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfMonthStr = firstDayOfMonth.toISOString().split('T')[0];
        
        const snapshot = await getDocs(collection(db, "reports"));
        
        let monthlyRepairs = 0;
        let monthlyCost = 0;
        let totalReports = 0;
        let approvedReports = 0;
        
        snapshot.forEach(doc => {
            const report = doc.data();
            totalReports++;
            
            if (report.approved) {
                approvedReports++;
            }
            
            if (new Date(report.date) >= firstDayOfMonth) {
                monthlyRepairs += report.repairs;
                monthlyCost += report.cost;
            }
        });
        
        // Calculate approval rate
        const approvalRate = totalReports > 0 ? Math.round((approvedReports / totalReports) * 100) : 0;
        
        // Animate stats
        setTimeout(() => {
            animateCounter(statTotalRepairs, monthlyRepairs);
            animateCounter(statTotalCost, monthlyCost, true);
            statApprovalRate.textContent = `${approvalRate}%`;
        }, 500);
        
    } catch (error) {
        console.error("Error updating stats:", error);
        showNotification("Failed to update dashboard statistics", "error");
        
        // Show error state
        statTotalRepairs.textContent = "Error";
        statTotalCost.textContent = "Error";
        statApprovalRate.textContent = "Error";
    }
}

// Populate employee dropdowns with loading indicator
async function loadEmployees() {
    const employeeSelect = document.getElementById("employee");
    
    // Show loading state
    employeeSelect.innerHTML = '<option value="">Loading employees...</option>';
    employeeFilter.innerHTML = '<option value="">Loading...</option>';
    
    try {
        const snapshot = await getDocs(collection(db, "employees"));
        
        // Reset options
        employeeSelect.innerHTML = '<option value="">Choose an employee</option>';
        employeeFilter.innerHTML = '<option value="">All Employees</option>';
        
        // Check if we have any employees
        if (snapshot.empty) {
            employeeSelect.innerHTML = '<option value="">No employees found</option>';
            return;
        }
        
        // Sort employees alphabetically
        const employees = [];
        snapshot.forEach(doc => {
            employees.push(doc.data().name);
        });
        employees.sort();
        
        // Add sorted employees to dropdowns
        employees.forEach(name => {
            const opt1 = document.createElement("option");
            opt1.value = opt1.textContent = name;
            employeeSelect.appendChild(opt1);

            const opt2 = document.createElement("option");
            opt2.value = opt2.textContent = name;
            employeeFilter.appendChild(opt2);
        });
    } catch (error) {
        console.error("Error loading employees:", error);
        employeeSelect.innerHTML = '<option value="">Error loading employees</option>';
        employeeFilter.innerHTML = '<option value="">Error loading</option>';
        showNotification("Failed to load employees. Please reload the page.", "error");
    }
}

// Weekly Top Employee with better visualization
async function loadTopEmployeeThisWeek() {
    const topEmployeeElement = document.getElementById("topEmployeeName");
    
    // Show loading state
    topEmployeeElement.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Calculating top performer...';
    
    try {
        const snapshot = await getDocs(collection(db, "reports"));
        const now = new Date();
        const start = new Date(now.setDate(now.getDate() - now.getDay() + 1));
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        const stats = {};
        snapshot.forEach(docSnap => {
            const report = docSnap.data();
            const reportDate = new Date(report.date);
            if (report.approved && reportDate >= start && reportDate <= end) {
                if (!stats[report.employee]) {
                    stats[report.employee] = { repairs: 0, cost: 0 };
                }
                stats[report.employee].repairs += report.repairs;
                stats[report.employee].cost += report.cost;
            }
        });

        let top = null, max = -1;
        for (const [name, stat] of Object.entries(stats)) {
            if (stat.repairs > max) {
                max = stat.repairs;
                top = { name, ...stat };
            }
        }

        if (top) {
            topEmployeeElement.innerHTML = `
                <div class="top-employee-content">
                    <div class="top-employee-name">
                        <i class="fas fa-medal fa-lg"></i> ${top.name}
                    </div>
                    <div class="top-employee-stats">
                        <div class="top-stat">
                            <i class="fas fa-tools"></i> ${top.repairs} repairs
                        </div>
                        <div class="top-stat">
                            <i class="fas fa-rupee-sign"></i> ₹${top.cost} revenue
                        </div>
                    </div>
                </div>
            `;
        } else {
            topEmployeeElement.innerHTML = `
                <div class="no-data-state">
                    <i class="fas fa-info-circle"></i> No approved reports for this week yet.
                </div>
            `;
        }
    } catch (error) {
        console.error("Error loading top employee:", error);
        topEmployeeElement.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i> Failed to load top performer data.
                <button class="btn btn-sm retry-button" onclick="loadTopEmployeeThisWeek()">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// Add styles for top employee
const topEmployeeStyle = document.createElement("style");
topEmployeeStyle.textContent = `
    .top-employee-content {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .top-employee-name {
        font-size: 20px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .top-employee-name i {
        color: gold;
    }
    
    .top-employee-stats {
        display: flex;
        gap: 20px;
    }
    
    .top-stat {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
    }
    
    .top-stat i {
        color: var(--accent);
    }
    
    .no-data-state, .error-state {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
        color: var(--text-muted);
    }
    
    .error-state {
        color: var(--danger);
    }
    
    .error-state i {
        color: var(--danger);
    }
    
    .retry-button {
        margin-left: 10px;
        padding: 5px 10px;
        font-size: 12px;
    }
    
    .empty-state-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 30px;
        text-align: center;
    }
    
    .empty-icon, .error-icon {
        font-size: 36px;
        color: var(--text-muted);
        margin-bottom: 15px;
    }
    
    .error-icon {
        color: var(--danger);
    }
    
    .empty-state-container p {
        margin: 5px 0;
        color: var(--text-muted);
    }
    
    .empty-state-container a {
        color: var(--accent);
        text-decoration: none;
    }
    
    .empty-state-container a:hover {
        text-decoration: underline;
    }
`;
document.head.appendChild(topEmployeeStyle);

// Filter reports when employee filter changes
employeeFilter.addEventListener("change", () => {
    loadReports(employeeFilter.value);
});

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadEmployees();
        await loadReports();
        await updateStats();
        loadTopEmployeeThisWeek();
    } catch (error) {
        console.error("Error initializing dashboard:", error);
        showNotification("There was an error loading the dashboard. Please refresh the page.", "error");
    }
});