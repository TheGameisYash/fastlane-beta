import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";
import { db } from './firebase.js';
import { 
    getDocs, 
    collection, 
    addDoc, 
    deleteDoc, 
    updateDoc, 
    doc, 
    query, 
    where, 
    Timestamp 
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

// Authentication check
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        console.log("Manager logged in:", user.email);
        initializeDashboard();
    }
});

// Initialize Dashboard
function initializeDashboard() {
    loadEmployees();
    loadReports();
    setupEventListeners();
    updateDashboardStats();
}

// Setup Event Listeners
function setupEventListeners() {
    // Logout Button
    document.getElementById("logoutButton").addEventListener("click", () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        }).catch((error) => {
            console.error("Error during logout:", error);
        });
    });

    // Dashboard Button
    document.getElementById("dashboardButton").addEventListener("click", () => {
        window.location.href = "index.html";
    });

    // Add Employee Form
    document.getElementById("addEmployeeForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const employeeName = document.getElementById("employeeName").value.trim();
        
        if (employeeName) {
            try {
                await addEmployee(employeeName);
                document.getElementById("employeeName").value = "";
                showNotification("Employee added successfully!", "success");
            } catch (error) {
                console.error("Error adding employee:", error);
                showNotification("Failed to add employee", "error");
            }
        }
    });

    // Employee Filter Change
    document.getElementById("employeeFilter").addEventListener("change", (e) => {
        const selectedEmployee = e.target.value;
        loadReports(selectedEmployee);
    });
}

// Show Notification (visual feedback)
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

// Update Dashboard Stats
async function updateDashboardStats() {
    try {
        // Count employees
        const employeesSnapshot = await getDocs(collection(db, "employees"));
        const employeeCount = employeesSnapshot.size;
        document.getElementById("statTotalEmployees").textContent = employeeCount;

        // Count reports
        const reportsSnapshot = await getDocs(collection(db, "reports"));
        let pendingCount = 0;
        let approvedCount = 0;

        // Get current month for filtering
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        reportsSnapshot.forEach(doc => {
            const report = doc.data();
            
            // Count pending reports
            if (!report.approved) {
                pendingCount++;
            }
            
            // Count approved reports this month
            if (report.approved) {
                const reportDate = new Date(report.date);
                if (reportDate >= firstDayOfMonth) {
                    approvedCount++;
                }
            }
        });

        document.getElementById("statPendingReports").textContent = pendingCount;
        document.getElementById("statApprovedReports").textContent = approvedCount;

    } catch (error) {
        console.error("Error updating dashboard stats:", error);
    }
}

// Load Employees
async function loadEmployees() {
    try {
        const employeeTableBody = document.getElementById("employeeList");
        const employeeFilter = document.getElementById("employeeFilter");
        const snapshot = await getDocs(collection(db, "employees"));
        
        // Clear existing content
        employeeTableBody.innerHTML = "";
        employeeFilter.innerHTML = '<option value="">All Employees</option>';
        
        // Update table and dropdown with employee data
        snapshot.forEach(docSnap => {
            const employee = docSnap.data();
            const employeeId = docSnap.id;
            
            // Add to employee table
            const row = document.createElement("tr");
            row.innerHTML = `
                <td data-label="Employee Name">${employee.name}</td>
                <td data-label="Actions">
                    <button class="btn btn-danger btn-sm delete-employee" data-id="${employeeId}">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </td>
            `;
            employeeTableBody.appendChild(row);
            
            // Add to filter dropdown
            const option = document.createElement("option");
            option.value = employee.name;
            option.textContent = employee.name;
            employeeFilter.appendChild(option);
        });
        
        // Add event listeners to delete buttons
        const deleteButtons = document.querySelectorAll(".delete-employee");
        deleteButtons.forEach(button => {
            button.addEventListener("click", async () => {
                const id = button.getAttribute("data-id");
                if (confirm("Are you sure you want to remove this employee?")) {
                    await removeEmployee(id);
                }
            });
        });
    } catch (error) {
        console.error("Error loading employees:", error);
        showNotification("Failed to load employees", "error");
    }
}

// Add Employee
async function addEmployee(name) {
    await addDoc(collection(db, "employees"), { 
        name,
        dateAdded: new Date().toISOString()
    });
    loadEmployees();
    updateDashboardStats();
}

// Remove Employee
async function removeEmployee(id) {
    try {
        await deleteDoc(doc(db, "employees", id));
        loadEmployees();
        updateDashboardStats();
        showNotification("Employee removed successfully", "success");
    } catch (error) {
        console.error("Error removing employee:", error);
        showNotification("Failed to remove employee", "error");
    }
}

// Load Reports
async function loadReports(employeeFilter = "") {
    try {
        const reportTable = document.getElementById("reportTable");
        const snapshot = await getDocs(collection(db, "reports"));
        
        // Clear existing content
        reportTable.innerHTML = "";
        
        let totalReports = 0;
        let approvedReports = 0;
        let totalCost = 0;
        
        // Process and display reports
        snapshot.forEach(docSnap => {
            const report = docSnap.data();
            const reportId = docSnap.id;
            
            // Apply filter if set
            if (employeeFilter && report.employee !== employeeFilter) return;
            
            // Convert cost to number if it's a string
            const cost = typeof report.cost === 'string' ? parseFloat(report.cost) : report.cost;
            
            // Create table row with data-label attributes for mobile view
            const row = document.createElement("tr");
            row.innerHTML = `
                <td data-label="Employee">${report.employee}</td>
                <td data-label="Date">${report.date}</td>
                <td data-label="Repairs">${report.repairs}</td>
                <td data-label="Cost">₹${cost}</td>
                <td data-label="Status">
                    <span class="status-badge ${report.approved ? 'status-approved' : 'status-pending'}">
                        ${report.approved ? '✔️ Approved' : '⏳ Pending'}
                    </span>
                </td>
                <td data-label="Actions" class="actions-cell">
                    <button class="btn ${report.approved ? 'btn-warning' : 'btn-success'} btn-sm toggle-approve" 
                            data-id="${reportId}" 
                            data-status="${report.approved}">
                        <i class="fas ${report.approved ? 'fa-times' : 'fa-check'}"></i>
                        ${report.approved ? 'Revoke' : 'Approve'}
                    </button>
                    <button class="btn btn-danger btn-sm delete-report" data-id="${reportId}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            reportTable.appendChild(row);
            
            // Update totals
            totalReports++;
            if (report.approved) approvedReports++;
            totalCost += cost;
        });
        
        // Update summary counters
        document.getElementById("totalReports").textContent = totalReports;
        document.getElementById("totalApproved").textContent = approvedReports;
        document.getElementById("totalCost").textContent = `₹${totalCost.toFixed(2)}`;
        
        // Add event listeners to buttons
        addReportActionListeners();
        
    } catch (error) {
        console.error("Error loading reports:", error);
        showNotification("Failed to load reports", "error");
    }
}

// Add event listeners to report action buttons
function addReportActionListeners() {
    // Approve/Revoke buttons
    const toggleButtons = document.querySelectorAll(".toggle-approve");
    toggleButtons.forEach(button => {
        button.addEventListener("click", async () => {
            const id = button.getAttribute("data-id");
            const currentStatus = button.getAttribute("data-status") === "true";
            await toggleApprove(id, currentStatus);
        });
    });
    
    // Delete buttons
    const deleteButtons = document.querySelectorAll(".delete-report");
    deleteButtons.forEach(button => {
        button.addEventListener("click", async () => {
            const id = button.getAttribute("data-id");
            if (confirm("Are you sure you want to delete this report?")) {
                await deleteReport(id);
            }
        });
    });
}

// Toggle Report Approval Status
async function toggleApprove(id, currentStatus) {
    try {
        const reportRef = doc(db, "reports", id);
        const newStatus = !currentStatus;
        await updateDoc(reportRef, { approved: newStatus });
        
        // Reload reports with current filter
        const currentFilter = document.getElementById("employeeFilter").value;
        loadReports(currentFilter);
        updateDashboardStats();
        
        showNotification(
            `Report ${newStatus ? 'approved' : 'approval revoked'} successfully`, 
            "success"
        );
    } catch (error) {
        console.error("Error updating report status:", error);
        showNotification("Failed to update report status", "error");
    }
}

// Delete Report
async function deleteReport(id) {
    try {
        await deleteDoc(doc(db, "reports", id));
        
        // Reload reports with current filter
        const currentFilter = document.getElementById("employeeFilter").value;
        loadReports(currentFilter);
        updateDashboardStats();
        
        showNotification("Report deleted successfully", "success");
    } catch (error) {
        console.error("Error deleting report:", error);
        showNotification("Failed to delete report", "error");
    }
}

// Add the manager-actions CSS
document.addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = `
        .manager-actions {
            display: flex;
            gap: 15px;
            margin-bottom: 10px;
            justify-content: flex-start;
        }
        
        @media (max-width: 600px) {
            .manager-actions {
                flex-direction: column;
                gap: 10px;
            }
            
            .manager-actions button {
                width: 100%;
            }
        }
        
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
    `;
    document.head.appendChild(style);
});