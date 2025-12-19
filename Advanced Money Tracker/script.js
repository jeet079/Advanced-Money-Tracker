// Global variables
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let customCategories = JSON.parse(localStorage.getItem('customCategories')) || [];
let currentTab = 'transactions';
let currentTypeFilter = 'all';
let analyticsChart = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function () {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    document.getElementById('from-date').value = getFirstDayOfMonth();
    document.getElementById('to-date').value = today;

    // Load transactions
    renderTransactions();
    updateSummary();

    // Set up tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function () {
            switchTab(this.dataset.tab);
        });
    });

    // Set up type toggle
    document.querySelectorAll('.type-toggle button').forEach(button => {
        button.addEventListener('click', function () {
            document.querySelectorAll('.type-toggle button').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentTypeFilter = this.dataset.type;
            filterTransactions();
        });
    });

    // Initialize chart
    initializeChart();
});

// Tab switching function
function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabId);
    });

    if (tabId === 'analytics') {
        updateChart();
    } else if (tabId === 'categories') {
        renderCustomCategories();
    }
}

// Add a new transaction
function addTransaction() {
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const category = document.getElementById('category').value;
    const note = document.getElementById('note').value;
    const date = document.getElementById('date').value;

    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    if (!category) {
        showToast('Please select a category', 'error');
        return;
    }

    if (!date) {
        showToast('Please select a date', 'error');
        return;
    }

    const transaction = {
        id: Date.now(),
        amount: type === 'income' ? amount : -amount,
        type,
        category,
        note,
        date,
        createdAt: new Date().toISOString()
    };

    transactions.push(transaction);
    saveTransactions();

    // Clear form
    document.getElementById('amount').value = '';
    document.getElementById('note').value = '';

    // Update UI
    renderTransactions();
    updateSummary();

    showToast('Transaction added successfully', 'success');

    // If on analytics tab, update the chart
    if (currentTab === 'analytics') {
        updateChart();
    }
}

// Render transactions list
function renderTransactions(filteredTransactions = null) {
    const list = document.getElementById('moneyList');
    const emptyState = document.getElementById('emptyState');
    const transactionsToRender = filteredTransactions || transactions;

    list.innerHTML = '';

    if (transactionsToRender.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    // Sort by date (newest first)
    const sortedTransactions = [...transactionsToRender].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedTransactions.forEach(transaction => {
        const li = document.createElement('li');
        li.className = `money-item ${transaction.type}`;

        li.innerHTML = `
          <div class="money-details">
            <div class="money-amount">${transaction.amount >= 0 ? '₹' + Math.abs(transaction.amount).toFixed(2) : '-₹' + Math.abs(transaction.amount).toFixed(2)}</div>
            <span class="money-category">${transaction.category}</span>
            ${transaction.note ? `<div class="money-note">${transaction.note}</div>` : ''}
            <div class="money-date">${formatDate(transaction.date)}</div>
          </div>
          <div class="money-actions">
            <button class="secondary" onclick="editTransaction(${transaction.id})"><i class="fas fa-edit"></i></button>
            <button class="danger" onclick="confirmDelete(${transaction.id})"><i class="fas fa-trash"></i></button>
          </div>
        `;

        list.appendChild(li);
    });
}

// Filter transactions based on filters
function filterTransactions() {
    const categoryFilter = document.getElementById('filter-category').value;
    const fromDate = document.getElementById('from-date').value;
    const toDate = document.getElementById('to-date').value;
    const searchQuery = document.getElementById('search').value.toLowerCase();

    let filtered = transactions;

    // Apply type filter
    if (currentTypeFilter !== 'all') {
        filtered = filtered.filter(t => t.type === currentTypeFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(t => t.category === categoryFilter);
    }

    // Apply date range filter
    if (fromDate) {
        filtered = filtered.filter(t => new Date(t.date) >= new Date(fromDate));
    }

    if (toDate) {
        filtered = filtered.filter(t => new Date(t.date) <= new Date(toDate));
    }

    // Apply search filter
    if (searchQuery) {
        filtered = filtered.filter(t =>
            (t.note && t.note.toLowerCase().includes(searchQuery)) ||
            t.category.toLowerCase().includes(searchQuery)
        );
    }

    renderTransactions(filtered);
    updateSummary(filtered);
}

// Update summary cards
function updateSummary(filteredTransactions = null) {
    const transactionsToCalculate = filteredTransactions || transactions;

    const income = transactionsToCalculate
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const expense = transactionsToCalculate
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const balance = income - expense;

    document.getElementById('total-income').textContent = `₹${income.toFixed(2)}`;
    document.getElementById('total-expense').textContent = `₹${expense.toFixed(2)}`;
    document.getElementById('total-balance').textContent = `₹${balance.toFixed(2)}`;

    // Update balance color based on value
    const balanceElement = document.getElementById('total-balance');
    if (balance > 0) {
        balanceElement.style.color = 'var(--success)';
    } else if (balance < 0) {
        balanceElement.style.color = 'var(--danger)';
    } else {
        balanceElement.style.color = 'var(--primary)';
    }
}

// Edit transaction
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    document.getElementById('edit-id').value = transaction.id;
    document.getElementById('edit-amount').value = Math.abs(transaction.amount);
    document.getElementById('edit-type').value = transaction.type;
    document.getElementById('edit-category').value = transaction.category;
    document.getElementById('edit-date').value = transaction.date;
    document.getElementById('edit-note').value = transaction.note || '';

    openModal('editModal');
}

// Save edited transaction
function saveEditedTransaction() {
    const id = parseInt(document.getElementById('edit-id').value);
    const amount = parseFloat(document.getElementById('edit-amount').value);
    const type = document.getElementById('edit-type').value;
    const category = document.getElementById('edit-category').value;
    const date = document.getElementById('edit-date').value;
    const note = document.getElementById('edit-note').value;

    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    if (!category) {
        showToast('Please select a category', 'error');
        return;
    }

    if (!date) {
        showToast('Please select a date', 'error');
        return;
    }

    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return;

    transactions[index] = {
        ...transactions[index],
        amount: type === 'income' ? amount : -amount,
        type,
        category,
        date,
        note
    };

    saveTransactions();
    closeModal('editModal');
    renderTransactions();
    updateSummary();

    if (currentTab === 'analytics') {
        updateChart();
    }

    showToast('Transaction updated successfully', 'success');
}

// Confirm delete transaction
function confirmDelete(id) {
    document.getElementById('confirmDelete').onclick = function () {
        deleteTransaction(id);
        closeModal('confirmModal');
    };
    openModal('confirmModal');
}

// Delete transaction
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    renderTransactions();
    updateSummary();

    if (currentTab === 'analytics') {
        updateChart();
    }

    showToast('Transaction deleted successfully', 'success');
}

// Initialize chart
function initializeChart() {
    const ctx = document.getElementById('analyticsChart').getContext('2d');
    analyticsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Amount',
                data: [],
                backgroundColor: '#4361ee',
                borderColor: '#3a0ca3',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return '₹' + value;
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return '₹' + context.raw.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// Update chart data
function updateChart() {
    const period = document.getElementById('analytics-period').value;
    const type = document.getElementById('analytics-type').value;

    let filtered = transactions.filter(t => t.type === type);
    let labels = [];
    let data = [];

    // Filter by period
    const now = new Date();
    let startDate;

    switch (period) {
        case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        default: // all
            startDate = new Date(0);
    }

    filtered = filtered.filter(t => new Date(t.date) >= startDate);

    // Group by category
    const categories = {};
    filtered.forEach(t => {
        if (!categories[t.category]) {
            categories[t.category] = 0;
        }
        categories[t.category] += Math.abs(t.amount);
    });

    // Sort by amount (descending)
    const sortedCategories = Object.entries(categories)
        .sort((a, b) => b[1] - a[1]);

    // Get top 7 categories
    const topCategories = sortedCategories.slice(0, 7);

    // Prepare data for chart
    topCategories.forEach(([category, amount]) => {
        labels.push(category);
        data.push(amount);
    });

    // Update most spent category
    if (topCategories.length > 0) {
        document.getElementById('most-spent-category').textContent = topCategories[0][0];
        document.getElementById('most-spent-amount').textContent = '₹' + topCategories[0][1].toFixed(2);
    } else {
        document.getElementById('most-spent-category').textContent = '-';
        document.getElementById('most-spent-amount').textContent = '';
    }

    // Update average daily
    if (period === 'week' || period === 'month') {
        const days = period === 'week' ? 7 : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const total = filtered.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        document.getElementById('average-daily').textContent = '₹' + (total / days).toFixed(2);
    } else {
        document.getElementById('average-daily').textContent = '-';
    }

    // Update total transactions
    document.getElementById('total-transactions').textContent = filtered.length;

    // Update chart
    analyticsChart.data.labels = labels;
    analyticsChart.data.datasets[0].data = data;
    analyticsChart.data.datasets[0].label = type === 'income' ? 'Income' : 'Expenses';
    analyticsChart.data.datasets[0].backgroundColor = type === 'income' ? '#4cc9f0' : '#f72585';
    analyticsChart.data.datasets[0].borderColor = type === 'income' ? '#4895ef' : '#b5179e';
    analyticsChart.update();
}

// Add custom category
function addCustomCategory() {
    const name = document.getElementById('new-category-name').value.trim();
    const type = document.getElementById('new-category-type').value;

    if (!name) {
        showToast('Please enter a category name', 'error');
        return;
    }

    // Check if category already exists
    if (customCategories.some(c => c.name.toLowerCase() === name.toLowerCase() && c.type === type)) {
        showToast('This category already exists', 'error');
        return;
    }

    const category = {
        id: Date.now(),
        name,
        type
    };

    customCategories.push(category);
    saveCustomCategories();
    renderCustomCategories();

    // Clear form
    document.getElementById('new-category-name').value = '';

    showToast('Category added successfully', 'success');

    // Update category selectors
    updateCategorySelectors();
}

// Render custom categories
function renderCustomCategories() {
    const container = document.getElementById('custom-categories-list');
    container.innerHTML = '';

    if (customCategories.length === 0) {
        container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--gray);">No custom categories yet</p>';
        return;
    }

    customCategories.forEach(category => {
        const card = document.createElement('div');
        card.className = 'summary-card';
        card.style.position = 'relative';

        card.innerHTML = `
          <h3>${category.name}</h3>
          <span style="font-size: 0.8rem; color: ${category.type === 'income' ? 'var(--success)' : 'var(--danger)'}">
            ${category.type === 'income' ? 'Income' : 'Expense'}
          </span>
          <button class="danger" onclick="deleteCustomCategory(${category.id})" 
            style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;">
            <i class="fas fa-trash"></i>
          </button>
        `;

        container.appendChild(card);
    });
}

// Delete custom category
function deleteCustomCategory(id) {
    customCategories = customCategories.filter(c => c.id !== id);
    saveCustomCategories();
    renderCustomCategories();
    updateCategorySelectors();
    showToast('Category deleted successfully', 'success');
}

// Update category selectors with custom categories
function updateCategorySelectors() {
    // This function would update all category select elements in the app
    // Implementation omitted for brevity
}

// Modal functions
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    toast.className = `toast ${type}`;
    toastMessage.textContent = message;

    const icon = toast.querySelector('i');
    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Save transactions to localStorage
function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Save custom categories to localStorage
function saveCustomCategories() {
    localStorage.setItem('customCategories', JSON.stringify(customCategories));
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Helper function to get first day of current month
function getFirstDayOfMonth() {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
}
