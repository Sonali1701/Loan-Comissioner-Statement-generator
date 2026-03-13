(function () {
  const moneyIds = [
    'totalCheck',
    'commissionableOverride',
    'creditReport',
    'appraisal',
    'otherReimb1Amt',
    'otherReimb2Amt',
    'otherReimb3Amt',
    'houseFee',
    'teamLeadFee',
    'otherDeduction1',
    'otherDeduction2',
    'reimbToLO',
    'additionalAdjustments'
  ];

  const percentIds = ['splitPct'];

  const el = (id) => document.getElementById(id);

  const usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const clampToNumber = (n) => {
    if (!Number.isFinite(n)) return 0;
    return n;
  };

  const parseMoney = (value) => {
    if (value == null) return 0;
    const s = String(value).trim();
    if (!s) return 0;
    const normalized = s.replace(/[^0-9.-]/g, '');
    const n = Number(normalized);
    return clampToNumber(n);
  };

  const formatMoney = (n) => usd.format(clampToNumber(n));

  const parsePercent = (value) => {
    if (value == null) return null;
    const s = String(value).trim();
    if (!s) return null;
    const normalized = s.replace(/[^0-9.-]/g, '');
    if (!normalized) return null;
    const raw = Number(normalized);
    if (!Number.isFinite(raw)) return null;

    if (raw > 1) return raw / 100;
    return raw;
  };

  const formatPercent = (p) => {
    if (p == null) return '';
    const n = clampToNumber(p);
    return `${(n * 100).toFixed(2)}%`;
  };

  const ensureSpace = (doc, currentY, neededHeight, left, right) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = 54;
    if (currentY + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      return 56;
    }
    return currentY;
  };

  const getState = () => {
    const state = {
      loName: el('loName').value.trim(),
      organization: el('organization').value.trim(),
      teamLeader: el('teamLeader').value.trim(),
      borrowerName: el('borrowerName').value.trim(),
      payDate: el('payDate').value,
      companyName: el('companyName').value.trim(),

      totalCheck: parseMoney(el('totalCheck').value),
      commissionableOverride: el('commissionableOverride').value.trim(),
      splitPct: parsePercent(el('splitPct').value),

      creditReport: parseMoney(el('creditReport').value),
      appraisal: parseMoney(el('appraisal').value),

      otherReimb1Desc: el('otherReimb1Desc').value.trim(),
      otherReimb1Amt: parseMoney(el('otherReimb1Amt').value),
      otherReimb2Desc: el('otherReimb2Desc').value.trim(),
      otherReimb2Amt: parseMoney(el('otherReimb2Amt').value),
      otherReimb3Desc: el('otherReimb3Desc').value.trim(),
      otherReimb3Amt: parseMoney(el('otherReimb3Amt').value),

      houseFee: parseMoney(el('houseFee').value),
      teamLeadFee: parseMoney(el('teamLeadFee').value),
      otherDeduction1Desc: el('otherDeduction1Desc').value.trim(),
      otherDeduction1: parseMoney(el('otherDeduction1').value),
      otherDeduction2Desc: el('otherDeduction2Desc').value.trim(),
      otherDeduction2: parseMoney(el('otherDeduction2').value),

      reimbToLODesc: el('reimbToLODesc').value.trim(),
      reimbToLO: parseMoney(el('reimbToLO').value),
      additionalAdjustmentsDesc: el('additionalAdjustmentsDesc').value.trim(),
      additionalAdjustments: parseMoney(el('additionalAdjustments').value)
    };

    const overrideNum = parseMoney(state.commissionableOverride);
    const overrideProvided = state.commissionableOverride.length > 0;

    const totalReimbursements =
      state.creditReport +
      state.appraisal +
      state.otherReimb1Amt +
      state.otherReimb2Amt +
      state.otherReimb3Amt;

    const commissionableAuto = state.totalCheck - totalReimbursements;
    const commissionableAmount = overrideProvided ? overrideNum : commissionableAuto;

    const loCommission =
      state.splitPct == null
        ? commissionableAmount
        : commissionableAmount * clampToNumber(state.splitPct);

    const totalDeductions =
      state.houseFee +
      state.teamLeadFee +
      state.otherDeduction1 +
      state.otherDeduction2;

    const totalAdditions = state.reimbToLO + state.additionalAdjustments;

    const netCommissionPayable =
      loCommission - totalDeductions + totalReimbursements + totalAdditions;

    return {
      ...state,
      totalReimbursements,
      commissionableAuto,
      commissionableAmount,
      loCommission,
      totalDeductions,
      totalAdditions,
      netCommissionPayable
    };
  };

  const setText = (id, value) => {
    const node = el(id);
    if (node) node.textContent = value;
  };

  const updateOutputs = () => {
    const s = getState();

    setText('out-commissionable', formatMoney(s.commissionableAmount));
    setText('out-total-reimbursements', formatMoney(s.totalReimbursements));
    setText('out-before-deductions', formatMoney(s.loCommission));
    setText('out-total-deductions', formatMoney(s.totalDeductions));
    setText('out-total-additions', formatMoney(s.totalAdditions));
    setText('out-net', formatMoney(s.netCommissionPayable));

    const houseSplitInput = el('houseSplit');
    if (houseSplitInput) {
      if (s.splitPct == null) {
        houseSplitInput.value = '';
      } else {
        const remainderPct = 1 - clampToNumber(s.splitPct);
        const remainderAmt = s.commissionableAmount * remainderPct;
        houseSplitInput.value = `${formatPercent(remainderPct)}  ${formatMoney(remainderAmt)}`;
      }
    }

    const requiredMissing =
      !s.loName || !s.payDate || !Number.isFinite(s.totalCheck) || s.totalCheck === 0;

    el('alert-required').classList.toggle('alert-hidden', !requiredMissing);

    const negative = s.netCommissionPayable < 0;
    el('alert-negative').classList.toggle('alert-hidden', !negative);

    const netWrap = el('net-wrap');
    netWrap.classList.toggle('negative', negative);
    netWrap.classList.toggle('positive', !negative && s.netCommissionPayable > 0);
  };

  const attachMoneyFormatting = () => {
    for (const id of moneyIds) {
      const input = el(id);
      if (!input) continue;

      input.addEventListener('focus', () => {
        const n = parseMoney(input.value);
        input.value = input.value.trim() ? String(n) : '';
      });

      input.addEventListener('blur', () => {
        const n = parseMoney(input.value);
        input.value = input.value.trim() ? formatMoney(n) : '';
        updateOutputs();
      });

      input.addEventListener('input', updateOutputs);
    }

    for (const id of percentIds) {
      const input = el(id);
      if (!input) continue;

      input.addEventListener('blur', () => {
        const p = parsePercent(input.value);
        input.value = p == null ? '' : formatPercent(p);
        updateOutputs();
      });

      input.addEventListener('focus', () => {
        const p = parsePercent(input.value);
        input.value = p == null ? '' : String(p > 0 && p < 1 ? (p * 100).toFixed(2) : p);
      });

      input.addEventListener('input', updateOutputs);
    }

    const textChangeIds = [
      'loName',
      'organization',
      'teamLeader',
      'borrowerName',
      'payDate',
      'companyName',
      'otherDeduction1Desc',
      'otherDeduction2Desc',
      'reimbToLODesc',
      'additionalAdjustmentsDesc',
      'otherReimb1Desc',
      'otherReimb2Desc',
      'otherReimb3Desc'
    ];

    for (const id of textChangeIds) {
      const input = el(id);
      if (!input) continue;
      input.addEventListener('input', updateOutputs);
      input.addEventListener('change', updateOutputs);
    }
  };

  const formatInitialMoney = () => {
    for (const id of moneyIds) {
      const input = el(id);
      if (!input) continue;
      const n = parseMoney(input.value);
      if (input.value.trim()) input.value = formatMoney(n);
    }
  };

  const validateRequired = (s) => {
    const missing = [];
    if (!s.loName) missing.push('Loan Officer Name');
    if (!s.payDate) missing.push('Pay Date');
    if (!Number.isFinite(s.totalCheck) || s.totalCheck === 0) missing.push('Total Check Amount');

    return { ok: missing.length === 0, missing };
  };

  const drawKeyValue = (doc, xLabel, xValue, y, label, value) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(String(label), xLabel, y);
    doc.text(String(value ?? ''), xValue, y);
  };

  const line = (doc, x1, y1, x2, y2) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.6);
    doc.line(x1, y1, x2, y2);
  };

  const generatePdf = () => {
    const s = getState();
    const v = validateRequired(s);

    if (!v.ok) {
      alert(`Please fill required fields: ${v.missing.join(', ')}`);
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });

    const left = 54;
    const right = 558;
    let y = 56;

    const company = s.companyName || 'Company Name';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(company, left, y);

    y += 28;
    doc.setFontSize(22);
    doc.text('Loan Officer Commission Statement', left, y);

    y += 14;
    line(doc, left, y, right, y);

    y += 22;
    doc.setFontSize(13);
    doc.text('Loan Information', left, y);

    y += 8;
    line(doc, left, y, right, y);

    y += 22;
    const xLabel = left;
    const xValue = 350;

    drawKeyValue(doc, xLabel, xValue, y, 'Loan Officer Name', s.loName);
    y += 20;
    if (s.organization) {
      drawKeyValue(doc, xLabel, xValue, y, 'Organization (Corp/LLC)', s.organization);
      y += 20;
    }
    drawKeyValue(doc, xLabel, xValue, y, 'Borrower Name', s.borrowerName);
    y += 20;

    const payDateText = s.payDate ? new Date(s.payDate + 'T00:00:00').toLocaleDateString() : '';
    drawKeyValue(doc, xLabel, xValue, y, 'Pay Date', payDateText);

    y += 28;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Compensation Breakdown', left, y);

    y += 8;
    line(doc, left, y, right, y);

    y += 22;
    doc.setFont('helvetica', 'normal');

    drawKeyValue(doc, xLabel, xValue, y, 'Total Check Amount', formatMoney(s.totalCheck));
    y += 20;
    drawKeyValue(doc, xLabel, xValue, y, 'Commissionable Amount', formatMoney(s.commissionableAmount));
    y += 20;
    const splitText =
      s.splitPct == null
        ? ''
        : (() => {
            const remainderPct = 1 - clampToNumber(s.splitPct);
            const remainderAmt = s.commissionableAmount * remainderPct;
            return `${formatPercent(s.splitPct)}   /   ${formatPercent(remainderPct)} ${formatMoney(remainderAmt)}`;
          })();
    drawKeyValue(doc, xLabel, xValue, y, 'Split Percentage', splitText);
    y += 20;
    drawKeyValue(
      doc,
      xLabel,
      xValue,
      y,
      'LO Commission Before Deductions',
      formatMoney(s.loCommission)
    );

    y += 28;
    y = ensureSpace(doc, y, 170, left, right);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Pass-Through Reimbursements', left, y);

    y += 8;
    line(doc, left, y, right, y);

    y += 22;
    doc.setFont('helvetica', 'normal');

    const other1Label = s.otherReimb1Desc ? s.otherReimb1Desc : 'Other Reimbursement 1';
    const other2Label = s.otherReimb2Desc ? s.otherReimb2Desc : 'Other Reimbursement 2';
    const other3Label = s.otherReimb3Desc ? s.otherReimb3Desc : 'Other Reimbursement 3';

    drawKeyValue(doc, xLabel, xValue, y, 'Credit Report Reimbursement', formatMoney(s.creditReport));
    y += 20;
    drawKeyValue(doc, xLabel, xValue, y, 'Appraisal Reimbursement', formatMoney(s.appraisal));
    y += 20;
    drawKeyValue(doc, xLabel, xValue, y, other1Label, formatMoney(s.otherReimb1Amt));
    y += 20;
    drawKeyValue(doc, xLabel, xValue, y, other2Label, formatMoney(s.otherReimb2Amt));
    y += 20;
    drawKeyValue(doc, xLabel, xValue, y, other3Label, formatMoney(s.otherReimb3Amt));
    y += 20;
    drawKeyValue(doc, xLabel, xValue, y, 'Total Reimbursements', formatMoney(s.totalReimbursements));

    y += 28;
    y = ensureSpace(doc, y, 150, left, right);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Deductions', left, y);

    y += 8;
    line(doc, left, y, right, y);

    y += 22;
    doc.setFont('helvetica', 'normal');

    drawKeyValue(doc, xLabel, xValue, y, 'House Fee', formatMoney(s.houseFee));
    y += 20;
    drawKeyValue(doc, xLabel, xValue, y, 'Team Lead Fee', formatMoney(s.teamLeadFee));
    y += 20;

    const otherDed1Label = s.otherDeduction1Desc ? s.otherDeduction1Desc : 'Other Deduction 1';
    const otherDed2Label = s.otherDeduction2Desc ? s.otherDeduction2Desc : 'Other Deduction 2';
    drawKeyValue(doc, xLabel, xValue, y, otherDed1Label, formatMoney(s.otherDeduction1));
    y += 20;
    drawKeyValue(doc, xLabel, xValue, y, otherDed2Label, formatMoney(s.otherDeduction2));
    y += 20;
    drawKeyValue(doc, xLabel, xValue, y, 'Total Deductions', formatMoney(s.totalDeductions));

    y += 28;
    y = ensureSpace(doc, y, 140, left, right);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Additions / Adjustments', left, y);

    y += 8;
    line(doc, left, y, right, y);

    y += 22;
    doc.setFont('helvetica', 'normal');

    const reimbToLOLabel = s.reimbToLODesc ? s.reimbToLODesc : 'Reimbursements to Loan Officer';
    const adjLabel = s.additionalAdjustmentsDesc ? s.additionalAdjustmentsDesc : 'Additional Adjustments';

    drawKeyValue(doc, xLabel, xValue, y, reimbToLOLabel, formatMoney(s.reimbToLO));
    y += 20;
    drawKeyValue(doc, xLabel, xValue, y, adjLabel, formatMoney(s.additionalAdjustments));
    y += 20;
    drawKeyValue(doc, xLabel, xValue, y, 'Total Additions', formatMoney(s.totalAdditions));

    y += 34;
    y = ensureSpace(doc, y, 120, left, right);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Net Commission Paid to Loan Officer', left, y);

    y += 10;
    const boxTop = y;
    const boxHeight = 56;
    doc.setDrawColor(0);
    doc.setLineWidth(1);
    doc.rect(left, boxTop, right - left, boxHeight);

    doc.setFontSize(20);
    doc.text(formatMoney(s.netCommissionPayable), left + 12, boxTop + 38);

    doc.save(`Commission_Statement_${s.loName.replace(/\s+/g, '_')}_${payDateText.replace(/\//g, '-')}.pdf`);
  };

  const init = () => {
    attachMoneyFormatting();
    formatInitialMoney();
    updateOutputs();

    if (window.flatpickr) {
      window.flatpickr('#payDate', {
        dateFormat: 'Y-m-d',
        allowInput: true,
        clickOpens: true,
        onChange: updateOutputs,
        onClose: updateOutputs
      });
    }

    el('btn-generate').addEventListener('click', generatePdf);
    el('btn-print').addEventListener('click', () => window.print());
    el('btn-reset').addEventListener('click', () => {
      document.getElementById('commission-form').reset();
      updateOutputs();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
