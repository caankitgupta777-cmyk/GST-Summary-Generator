// Dashboard State
let state = {
    activeTab: 'purchase',
    purchase: [],
    sales: [],
    theme: 'dark'
};

// DOM Elements
const docBody = document.body;
const themeToggleBtn = document.getElementById('theme-toggle');
const tabButtons = document.querySelectorAll('.tab-btn');
const fileDropzone = document.getElementById('file-dropzone');
const fileInput = document.getElementById('file-input');
const selectFilesBtn = fileDropzone.querySelector('.btn-secondary');
const processingLoader = document.getElementById('processing-loader');
const datatableTitle = document.getElementById('table-title');
const tableBody = document.getElementById('table-body');
const addRowBtn = document.getElementById('add-row-btn');
const exportBtn = document.getElementById('export-btn');
const reportMonthInput = document.getElementById('report-month');
const toastEl = document.getElementById('toast');

// Table totals DOM
const totalTaxableEl = document.getElementById('total-taxable');
const totalCgstEl = document.getElementById('total-cgst');
const totalSgstEl = document.getElementById('total-sgst');
const totalIgstEl = document.getElementById('total-igst');
const totalValueEl = document.getElementById('total-value');

// Summary Card DOM
const summarySalesCgst = document.getElementById('summary-sales-cgst');
const summarySalesSgst = document.getElementById('summary-sales-sgst');
const summarySalesIgst = document.getElementById('summary-sales-igst');
const summarySalesTotal = document.getElementById('summary-sales-total');

const summaryPurCgst = document.getElementById('summary-pur-cgst');
const summaryPurSgst = document.getElementById('summary-pur-sgst');
const summaryPurIgst = document.getElementById('summary-pur-igst');
const summaryPurTotal = document.getElementById('summary-pur-total');

const netCgst = document.getElementById('net-cgst');
const netSgst = document.getElementById('net-sgst');
const netIgst = document.getElementById('net-igst');
const netTotal = document.getElementById('net-total');

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    // Theme initialization
    const savedTheme = localStorage.getItem('gst-creator-theme') || 'dark';
    setTheme(savedTheme);
    
    // Initial Render
    renderActiveTable();
    updateSummary();
    
    // Attach Event Listeners
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeTab = btn.getAttribute('data-tab');
            renderActiveTable();
        });
    });

    // Dropzone listeners
    fileDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropzone.classList.add('dragover');
    });
    
    fileDropzone.addEventListener('dragleave', () => {
        fileDropzone.classList.remove('dragover');
    });
    
    fileDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropzone.classList.remove('dragover');
        handleFileUpload(e.dataTransfer.files);
    });
    
    selectFilesBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFileUpload(e.target.files));
    
    // Add manual row
    addRowBtn.addEventListener('click', addManualRow);
    
    // Export handler
    exportBtn.addEventListener('click', exportToExcel);
});

// Toast notification
function showToast(message, type = 'success') {
    toastEl.textContent = message;
    toastEl.className = `toast show ${type}`;
    setTimeout(() => {
        toastEl.classList.remove('show');
    }, 4000);
}

// Theme management
function setTheme(theme) {
    state.theme = theme;
    if (theme === 'light') {
        docBody.classList.remove('dark-mode');
        docBody.classList.add('light-mode');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
        docBody.classList.remove('light-mode');
        docBody.classList.add('dark-mode');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
    localStorage.setItem('gst-creator-theme', theme);
}

function toggleTheme() {
    setTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// Upload & OCR Parsing
function handleFileUpload(files) {
    if (files.length === 0) return;
    
    processingLoader.style.display = 'flex';
    fileDropzone.style.pointerEvents = 'none';
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files[]', files[i]);
    }
    formData.append('is_sales', state.activeTab === 'sales');
    
    fetch('/api/upload', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        processingLoader.style.display = 'none';
        fileDropzone.style.pointerEvents = 'auto';
        
        let successCount = 0;
        let errorCount = 0;
        
        if (data.results) {
            data.results.forEach(res => {
                if (res.status === 'success') {
                    state[state.activeTab].push(res.data);
                    successCount++;
                } else {
                    errorCount++;
                    console.error('File parsing error:', res.error);
                }
            });
        }
        
        if (successCount > 0) {
            showToast(`Successfully parsed ${successCount} bill(s).`, 'success');
        }
        if (errorCount > 0) {
            showToast(`Failed to parse ${errorCount} bill(s). Check logs.`, 'error');
        }
        
        renderActiveTable();
        updateSummary();
    })
    .catch(err => {
        processingLoader.style.display = 'none';
        fileDropzone.style.pointerEvents = 'auto';
        showToast('Error uploading or processing files.', 'error');
        console.error(err);
    });
}

// Table Rendering & Events
function renderActiveTable() {
    const isSales = state.activeTab === 'sales';
    datatableTitle.textContent = isSales ? 'Sales Invoices' : 'Purchase Invoices';
    
    tableBody.innerHTML = '';
    const currentList = state[state.activeTab];
    
    if (currentList.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="12" style="text-align: center; padding: 2rem; color: var(--text-muted-dark);">
            <i class="fa-regular fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
            No bills uploaded yet. Drag & drop files or click select to import.
        </td>`;
        tableBody.appendChild(tr);
        resetTableTotals();
        return;
    }
    
    currentList.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-idx', index);
        
        tr.innerHTML = `
            <td style="text-align: center;">${index + 1}</td>
            <td><input type="text" class="cell-input date-cell" value="${item.date || ''}"></td>
            <td><input type="text" class="cell-input party-cell" value="${item.party_name || ''}"></td>
            <td><input type="text" class="cell-input gst-cell" value="${item.gst_number || ''}"></td>
            <td><input type="text" class="cell-input inv-cell" value="${item.invoice_number || ''}"></td>
            <td><input type="number" step="0.01" class="cell-input rate-cell" value="${(item.gst_rate * 100).toFixed(0)}" style="text-align: center;"></td>
            <td><input type="number" step="0.01" class="cell-input taxable-cell" value="${item.taxable_value.toFixed(2)}" style="text-align: right;"></td>
            <td><input type="number" step="0.01" class="cell-input cgst-cell" value="${item.cgst.toFixed(2)}" style="text-align: right;"></td>
            <td><input type="number" step="0.01" class="cell-input sgst-cell" value="${item.sgst.toFixed(2)}" style="text-align: right;"></td>
            <td><input type="number" step="0.01" class="cell-input igst-cell" value="${item.igst.toFixed(2)}" style="text-align: right;"></td>
            <td><input type="number" step="0.01" class="cell-input total-cell" value="${item.total_invoice_value.toFixed(2)}" style="text-align: right;"></td>
            <td style="text-align: center;">
                <button class="btn-delete" title="Delete Invoice"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;
        
        // Add listeners to input changes
        tr.querySelectorAll('.cell-input').forEach(input => {
            input.addEventListener('change', (e) => handleCellChange(e, index));
        });
        
        // Delete button listener
        tr.querySelector('.btn-delete').addEventListener('click', () => deleteInvoiceRow(index));
        
        tableBody.appendChild(tr);
    });
    
    calculateTableTotals();
}

function handleCellChange(e, index) {
    const el = e.target;
    const item = state[state.activeTab][index];
    
    if (el.classList.contains('date-cell')) item.date = el.value;
    else if (el.classList.contains('party-cell')) item.party_name = el.value;
    else if (el.classList.contains('gst-cell')) item.gst_number = el.value.toUpperCase();
    else if (el.classList.contains('inv-cell')) item.invoice_number = el.value;
    else if (el.classList.contains('rate-cell')) {
        item.gst_rate = parseFloat(el.value) / 100;
        recalculateRow(index, 'rate');
    }
    else if (el.classList.contains('taxable-cell')) {
        item.taxable_value = parseFloat(el.value) || 0;
        recalculateRow(index, 'taxable');
    }
    else if (el.classList.contains('cgst-cell')) {
        item.cgst = parseFloat(el.value) || 0;
        recalculateRow(index, 'cgst');
    }
    else if (el.classList.contains('sgst-cell')) {
        item.sgst = parseFloat(el.value) || 0;
        recalculateRow(index, 'sgst');
    }
    else if (el.classList.contains('igst-cell')) {
        item.igst = parseFloat(el.value) || 0;
        recalculateRow(index, 'igst');
    }
    else if (el.classList.contains('total-cell')) {
        item.total_invoice_value = parseFloat(el.value) || 0;
        recalculateRow(index, 'total');
    }
    
    // Refresh table totals & summary cards
    calculateTableTotals();
    updateSummary();
}

// Smart autocalculation logic based on changed cell
function recalculateRow(index, changedField) {
    const item = state[state.activeTab][index];
    const rate = item.gst_rate;
    
    if (changedField === 'taxable' || changedField === 'rate') {
        // If taxable or rate changes, calculate GST
        const isInterState = checkIfInterState(item.gst_number);
        
        if (isInterState) {
            item.igst = item.taxable_value * rate;
            item.cgst = 0;
            item.sgst = 0;
        } else {
            item.igst = 0;
            item.cgst = item.taxable_value * (rate / 2);
            item.sgst = item.taxable_value * (rate / 2);
        }
        item.total_invoice_value = item.taxable_value + item.cgst + item.sgst + item.igst;
    } 
    else if (changedField === 'cgst') {
        // Maintain symmetric CGST/SGST if no IGST
        item.sgst = item.cgst;
        item.igst = 0;
        item.total_invoice_value = item.taxable_value + item.cgst + item.sgst + item.igst;
    }
    else if (changedField === 'sgst') {
        item.cgst = item.sgst;
        item.igst = 0;
        item.total_invoice_value = item.taxable_value + item.cgst + item.sgst + item.igst;
    }
    else if (changedField === 'igst') {
        item.cgst = 0;
        item.sgst = 0;
        item.total_invoice_value = item.taxable_value + item.cgst + item.sgst + item.igst;
    }
    else if (changedField === 'total') {
        // Estimate taxable value backwards
        item.taxable_value = item.total_invoice_value / (1 + rate);
        const isInterState = checkIfInterState(item.gst_number);
        if (isInterState) {
            item.igst = item.total_invoice_value - item.taxable_value;
            item.cgst = 0;
            item.sgst = 0;
        } else {
            item.igst = 0;
            const gstHalf = (item.total_invoice_value - item.taxable_value) / 2;
            item.cgst = gstHalf;
            item.sgst = gstHalf;
        }
    }
    
    // Update inputs in UI
    const tr = tableBody.querySelector(`tr[data-idx="${index}"]`);
    if (tr) {
        tr.querySelector('.taxable-cell').value = item.taxable_value.toFixed(2);
        tr.querySelector('.cgst-cell').value = item.cgst.toFixed(2);
        tr.querySelector('.sgst-cell').value = item.sgst.toFixed(2);
        tr.querySelector('.igst-cell').value = item.igst.toFixed(2);
        tr.querySelector('.total-cell').value = item.total_invoice_value.toFixed(2);
    }
}

// GSTIN State code lookup (first 2 digits)
function checkIfInterState(gstin) {
    if (!gstin || gstin.length < 2) return false;
    const stateCode = gstin.substring(0, 2);
    // Client state code is 27 (Maharashtra)
    return stateCode !== "27";
}

function addManualRow() {
    const newRow = {
        date: '',
        party_name: '',
        gst_number: '',
        invoice_number: '',
        gst_rate: 0.18,
        taxable_value: 0.0,
        cgst: 0.0,
        sgst: 0.0,
        igst: 0.0,
        total_invoice_value: 0.0
    };
    
    state[state.activeTab].push(newRow);
    renderActiveTable();
    updateSummary();
}

function deleteInvoiceRow(index) {
    state[state.activeTab].splice(index, 1);
    renderActiveTable();
    updateSummary();
    showToast("Invoice deleted.", "info");
}

// Totals & Summaries calculations
function resetTableTotals() {
    totalTaxableEl.textContent = '0.00';
    totalCgstEl.textContent = '0.00';
    totalSgstEl.textContent = '0.00';
    totalIgstEl.textContent = '0.00';
    totalValueEl.textContent = '0.00';
}

function calculateTableTotals() {
    const list = state[state.activeTab];
    let taxableSum = 0;
    let cgstSum = 0;
    let sgstSum = 0;
    let igstSum = 0;
    let totalSum = 0;
    
    list.forEach(item => {
        taxableSum += item.taxable_value || 0;
        cgstSum += item.cgst || 0;
        sgstSum += item.sgst || 0;
        igstSum += item.igst || 0;
        totalSum += item.total_invoice_value || 0;
    });
    
    totalTaxableEl.textContent = taxableSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    totalCgstEl.textContent = cgstSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    totalSgstEl.textContent = sgstSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    totalIgstEl.textContent = igstSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    totalValueEl.textContent = totalSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updateSummary() {
    let salesCgst = 0, salesSgst = 0, salesIgst = 0, salesTotal = 0;
    let purCgst = 0, purSgst = 0, purIgst = 0, purTotal = 0;
    
    // Sum sales
    state.sales.forEach(item => {
        salesCgst += item.cgst || 0;
        salesSgst += item.sgst || 0;
        salesIgst += item.igst || 0;
    });
    salesTotal = salesCgst + salesSgst + salesIgst;
    
    // Sum purchase
    state.purchase.forEach(item => {
        purCgst += item.cgst || 0;
        purSgst += item.sgst || 0;
        purIgst += item.igst || 0;
    });
    purTotal = purCgst + purSgst + purIgst;
    
    // UI Populate
    summarySalesCgst.textContent = `₹${salesCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    summarySalesSgst.textContent = `₹${salesSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    summarySalesIgst.textContent = `₹${salesIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    summarySalesTotal.textContent = `₹${salesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    summaryPurCgst.textContent = `₹${purCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    summaryPurSgst.textContent = `₹${purSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    summaryPurIgst.textContent = `₹${purIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    summaryPurTotal.textContent = `₹${purTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    // Net values
    const diffCgst = salesCgst - purCgst;
    const diffSgst = salesSgst - purSgst;
    const diffIgst = salesIgst - purIgst;
    const diffTotal = salesTotal - purTotal;
    
    netCgst.textContent = `₹${diffCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    netSgst.textContent = `₹${diffSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    netIgst.textContent = `₹${diffIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    netTotal.textContent = `₹${diffTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    // Apply styling for refund vs payable
    setNetPayableStyle(netCgst, diffCgst);
    setNetPayableStyle(netSgst, diffSgst);
    setNetPayableStyle(netIgst, diffIgst);
    
    const totalPayableRow = document.getElementById('net-total').parentElement;
    if (diffTotal >= 0) {
        netTotal.textContent = `₹${diffTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Payable)`;
        totalPayableRow.style.color = 'var(--danger)';
    } else {
        netTotal.textContent = `₹${Math.abs(diffTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Credit)`;
        totalPayableRow.style.color = 'var(--success)';
    }
}

function setNetPayableStyle(element, value) {
    element.classList.remove('payable', 'refund');
    if (value >= 0) {
        element.classList.add('payable');
    } else {
        element.classList.add('refund');
        element.textContent = `₹${Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Credit)`;
    }
}

// Excel Export
function exportToExcel() {
    if (state.purchase.length === 0 && state.sales.length === 0) {
        showToast("No data to export. Please add or upload invoices first.", "error");
        return;
    }
    
    const exportData = {
        purchase: state.purchase,
        sales: state.sales,
        month: reportMonthInput.value || 'May 2026'
    };
    
    showToast("Generating Excel file...", "info");
    
    fetch('/api/export', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportData)
    })
    .then(response => {
        if (!response.ok) throw new Error("Export failed");
        return response.blob();
    })
    .then(blob => {
        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `GST_Summary_Report_${exportData.month.replace(' ', '_')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showToast("Excel exported successfully!", "success");
    })
    .catch(err => {
        showToast("Error exporting Excel sheet.", "error");
        console.error(err);
    });
}
