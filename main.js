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
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let totalPages = 1;
let allReports = [];
const dateRangeStart = document.getElementById('dateRangeStart');
const dateRangeEnd = document.getElementById('dateRangeEnd');
const applyFilters = document.getElementById('applyFilters');
const resetFilters = document.getElementById('resetFilters');

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

// Modify the loadReports function to handle both filters
async function loadReports(filterByEmployee = "", dateStart = "", dateEnd = "", highlightNewest = false) {
    try {
        reportTable.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading reports...</div></td></tr>';
        
        const snapshot = await getDocs(collection(db, "reports"));
        reportTable.innerHTML = "";
        
        let totalRepairs = 0;
        let totalCost = 0;
        allReports = [];
        
        // Collect and filter reports
        snapshot.forEach(docSnap => {
            const report = docSnap.data();
            let includeReport = true;
            
            // Apply employee filter if set
            if (filterByEmployee && report.employee !== filterByEmployee) {
                includeReport = false;
            }
            
            // Apply date range filter if set
            if (dateStart && dateEnd) {
                const reportDate = new Date(report.date);
                const startDate = new Date(dateStart);
                const endDate = new Date(dateEnd);
                endDate.setHours(23, 59, 59, 999); // Include the entire end date
                
                if (reportDate < startDate || reportDate > endDate) {
                    includeReport = false;
                }
            }
            
            if (includeReport) {
                allReports.push(report);
                totalRepairs += report.repairs;
                totalCost += report.cost;
            }
        });
        
        // Sort reports by date (newest first)
        allReports.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Reset pagination when filters change
        currentPage = 1;
        totalPages = Math.ceil(allReports.length / ITEMS_PER_PAGE);
        
        // Update UI
        updatePaginationUI();
        displayCurrentPage(highlightNewest);
        
        // Update totals with animation
        animateCounter(totalRepairsEl, totalRepairs);
        animateCounter(totalCostEl, totalCost, true);
        
    } catch (error) {
        console.error("Error loading reports:", error);
        showErrorState();
    }
}



// Update event listeners for filters
applyFilters.addEventListener('click', () => {
    const employee = employeeFilter.value;
    const dateStart = dateRangeStart.value;
    const dateEnd = dateRangeEnd.value;
    
    // Validate date range if either date is set
    if ((dateStart && !dateEnd) || (!dateStart && dateEnd)) {
        showNotification("Please select both start and end dates", "error");
        return;
    }
    
    if (dateStart && dateEnd && new Date(dateEnd) < new Date(dateStart)) {
        showNotification("End date cannot be before start date", "error");
        return;
    }
    
    loadReports(employee, dateStart, dateEnd);
});

resetFilters.addEventListener('click', () => {
    // Reset all filters
    employeeFilter.value = '';
    dateRangeStart.value = '';
    dateRangeEnd.value = '';
    loadReports();
});
// Add date validation
dateRangeStart.addEventListener('change', validateDateRange);
dateRangeEnd.addEventListener('change', validateDateRange);

function validateDateRange() {
    const startDate = dateRangeStart.value;
    const endDate = dateRangeEnd.value;
    
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        showNotification("End date cannot be before start date", "error");
        dateRangeEnd.value = '';
    }
}

// Function to display current page
function displayCurrentPage(highlightNewest = false) {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageReports = allReports.slice(start, end);
    
    reportTable.innerHTML = '';
    
    if (pageReports.length === 0) {
        showEmptyState();
        return;
    }
    
    pageReports.forEach((report, index) => {
        const row = document.createElement('tr');
        row.className = 'fade-in';
        row.style.animationDelay = `${index * 50}ms`;
        
        if (highlightNewest && index === 0 && currentPage === 1) {
            row.classList.add('highlight-row');
        }
        
        row.innerHTML = `
            <td data-label="Employee">${report.employee}</td>
            <td data-label="Date">${report.date}</td>
            <td data-label="Repairs">${report.repairs}</td>
            <td data-label="Cost">₹${report.cost}</td>
            <td data-label="Status">
                <span class="status-badge ${report.approved ? 'status-approved' : 'status-pending'}">
                    ${report.approved ? '✔️ Approved' : '⏳ Pending'}
                </span>
            </td>
        `;
        reportTable.appendChild(row);
    });
    
    // Update pagination info
    document.getElementById('paginationStart').textContent = start + 1;
    document.getElementById('paginationEnd').textContent = Math.min(end, allReports.length);
    document.getElementById('paginationTotal').textContent = allReports.length;
}

// Function to update pagination UI
function updatePaginationUI() {
    const paginationNumbers = document.getElementById('paginationNumbers');
    const prevButton = document.getElementById('paginationPrev');
    const nextButton = document.getElementById('paginationNext');
    
    // Clear existing numbers
    paginationNumbers.innerHTML = '';
    
    // Update prev/next buttons
    prevButton.disabled = currentPage === 1;
    prevButton.classList.toggle('disabled', currentPage === 1);
    nextButton.disabled = currentPage === totalPages;
    nextButton.classList.toggle('disabled', currentPage === totalPages);
    
    // Generate page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    // Add first page
    if (startPage > 1) {
        addPageNumber(1);
        if (startPage > 2) addEllipsis();
    }
    
    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
        addPageNumber(i);
    }
    
    // Add last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) addEllipsis();
        addPageNumber(totalPages);
    }
}

// Helper function to add page number
function addPageNumber(number) {
    const paginationNumbers = document.getElementById('paginationNumbers');
    const button = document.createElement('button');
    button.className = `page-number ${number === currentPage ? 'active' : ''}`;
    button.textContent = number;
    button.addEventListener('click', () => {
        if (number !== currentPage) {
            currentPage = number;
            displayCurrentPage();
            updatePaginationUI();
        }
    });
    paginationNumbers.appendChild(button);
}

// Helper function to add ellipsis
function addEllipsis() {
    const paginationNumbers = document.getElementById('paginationNumbers');
    const span = document.createElement('span');
    span.className = 'page-number disabled';
    span.textContent = '...';
    paginationNumbers.appendChild(span);
}

// Add event listeners for pagination
document.getElementById('paginationPrev').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayCurrentPage();
        updatePaginationUI();
    }
});

document.getElementById('paginationNext').addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        displayCurrentPage();
        updatePaginationUI();
    }
});

// Update showEmptyState to include date range info
function showEmptyState() {
    const filterByEmployee = employeeFilter.value;
    const dateStart = dateRangeStart.value;
    const dateEnd = dateRangeEnd.value;
    
    let filterMessage = '';
    if (filterByEmployee) {
        filterMessage += ` for ${filterByEmployee}`;
    }
    if (dateStart && dateEnd) {
        filterMessage += ` between ${new Date(dateStart).toLocaleDateString()} and ${new Date(dateEnd).toLocaleDateString()}`;
    }
    
    reportTable.innerHTML = `
        <tr>
            <td colspan="5" class="empty-state">
                <div class="empty-state-container">
                    <i class="fas fa-clipboard-list empty-icon"></i>
                    <p>No reports found${filterMessage}.</p>
                    <p><a href="#" id="clearFilter">Clear filters</a> to see all reports.</p>
                </div>
            </td>
        </tr>
    `;
    
    // Add click handler for clearing filters
    document.getElementById('clearFilter')?.addEventListener('click', (e) => {
        e.preventDefault();
        resetFilters.click();
    });
}

// Helper function to show error state
function showErrorState() {
    reportTable.innerHTML = `
        <tr>
            <td colspan="5" class="error-state">
                <div class="error-state-container">
                    <i class="fas fa-exclamation-circle error-icon"></i>
                    <p>Failed to load reports. Please try again.</p>
                    <button class="btn btn-sm btn-primary retry-button" onclick="loadReports()">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Reset pagination when filter changes
employeeFilter.addEventListener("change", () => {
    currentPage = 1;
    loadReports(employeeFilter.value);
});

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
    topEmployeeElement.innerHTML = `
        <div class="achievement-placeholder">
            <i class="fas fa-circle-notch fa-spin"></i> Calculating top performer...
        </div>
    `;
    
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
            // Format the amount with comma separators
            const formattedAmount = top.cost.toLocaleString('en-IN');
            
            topEmployeeElement.innerHTML = `
                <div class="top-employee-content">
                    <div class="top-employee-name">
                        <i class="fas fa-medal"></i> ${top.name}
                    </div>
                    <div class="top-employee-stats">
                        <div class="top-stat">
                            <div class="top-stat-value">${top.repairs}</div>
                            <div class="top-stat-label">Repairs</div>
                        </div>
                        <div class="top-stat">
                            <div class="top-stat-value">₹${formattedAmount}</div>
                            <div class="top-stat-label">Revenue</div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add some confetti effects
            const confettiColors = ['#4caf50', '#ffeb3b', '#ff9800', '#03a9f4', '#9c27b0'];
            for (let i = 0; i < 5; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'achievement-star';
                confetti.style.top = `${Math.random() * 100}%`;
                confetti.style.left = `${Math.random() * 100}%`;
                confetti.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
                confetti.style.animationDelay = `${Math.random() * 5}s`;
                document.querySelector('.achievement-card').appendChild(confetti);
            }
        } else {
            topEmployeeElement.innerHTML = `
                <div class="no-data-state">
                    <i class="fas fa-info-circle"></i>
                    <p>No approved reports for this week yet.</p>
                    <p>Complete repairs and submit reports to compete for the top spot!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error loading top employee:", error);
        topEmployeeElement.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load top performer data.</p>
                <button class="btn btn-sm btn-primary retry-button" onclick="loadTopEmployeeThisWeek()">
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