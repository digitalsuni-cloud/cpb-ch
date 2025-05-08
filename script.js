document.addEventListener("DOMContentLoaded", function () {
  // Function to add Rule Group dynamically
  function addRuleGroup() {
    const div = document.createElement('div');
    div.className = 'ruleGroup';
    div.innerHTML = `
      <div class="section-title">Rule Group</div>
      <label>Start Date:</label>
      <input type="date" class="startDate" required />
      <label>End Date (optional):</label>
      <input type="date" class="endDate" />
      <label>Enabled:</label>
      <select class="enabled">
        <option value="true" selected>true</option>
        <option value="false">false</option>
      </select>

      <div class="rules"></div>
      <button type="button" class="addRule">Add Billing Rule</button>
      <button type="button" class="removeRuleGroup">Remove Rule Group</button>
    `;
    document.getElementById('ruleGroups').appendChild(div);

    // Add event listeners for buttons inside the new rule group
    const addRuleButton = div.querySelector('.addRule');
    addRuleButton.addEventListener('click', function() {
      addRule(addRuleButton);
    });

    const removeRuleGroupButton = div.querySelector('.removeRuleGroup');
    removeRuleGroupButton.addEventListener('click', function() {
      div.remove();
    });
  }

  // Function to add Billing Rule dynamically
  function addRule(button) {
    const rulesContainer = button.previousElementSibling;
    const div = document.createElement('div');
    div.className = 'rule';
    div.innerHTML = `
      <label>Billing Rule Name:</label>
      <input type="text" class="ruleName" placeholder="Enter Billing Rule name" />
      
      <label>Billing Adjustment (e.g. 0.00):</label>
      <input type="number" class="billingAdjustment" />
      
      <label>Billing Rule Type:</label>
      <select class="billingRuleType">
        <option value="percentDiscount">percentDiscount</option>
        <option value="percentIncrease">percentIncrease</option>
        <option value="fixedRate">fixedRate</option>
      </select>

      <div class="small-label">Include Data Transfer:</div>
      <div class="small-select">
        <select class="includeDataTransfer">
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>

      <div class="small-label">Include RI Purchases:</div>
      <div class="small-select">
        <select class="includeRIPurchases">
          <option value="true">true</option>
          <option value="false" selected>false</option>
        </select>
      </div>

      <label>Product Name:</label>
      <input type="text" class="productName" placeholder="Leave empty for Any Products" />

      <div class="small-label">Product Include Data Transfer:</div>
      <div class="small-select">
        <select class="productIncludeDataTransfer">
          <option value="">(inherit)</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>

      <div class="small-label">Product Include RI Purchases:</div>
      <div class="small-select">
        <select class="productIncludeRIPurchases">
          <option value="">(inherit)</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>

      <label>Region (optional):</label>
      <input type="text" class="region" />

      <div class="sub-group">
        <label>Usage Types:</label>
        <div class="usageTypes"></div>
        <div class="sub-entry">
          <button type="button" onclick="addUsageType(this)">+</button>
        </div>
      </div>

      <div class="sub-group">
        <label>Line Item Descriptions:</label>
        <div class="lineItemDescriptions"></div>
        <div class="sub-entry">
          <button type="button" onclick="addLineItemDescription(this)">+</button>
        </div>
      </div>

      <button onclick="this.parentElement.remove()">Remove Rule</button>
    `;
    rulesContainer.appendChild(div);
  }

  // Function to add Usage Type dynamically
  function addUsageType(button) {
    const container = button.closest('.sub-group').querySelector('.usageTypes');
    const div = document.createElement('div');
    div.className = 'sub-entry';
    div.innerHTML = `
      <button type="button" onclick="this.parentElement.remove()">×</button>
      <input type="text" class="usageTypeName" placeholder="UsageType name..." />
    `;
    container.appendChild(div);
  }

  // Function to add Line Item Description dynamically
  function addLineItemDescription(button) {
    const container = button.closest('.sub-group').querySelector('.lineItemDescriptions');
    const div = document.createElement('div');
    div.className = 'sub-entry';
    div.innerHTML = `
      <button type="button" onclick="this.parentElement.remove()">×</button>
      <select class="lineItemType">
        <option value="contains">contains</option>
        <option value="startsWith">startsWith</option>
        <option value="matchesRegex">matchesRegex</option>
      </select>
      <input type="text" class="lineItemValue" placeholder="Value..." />
    `;
    container.appendChild(div);
  }

  // Function to generate XML
  function generateXML() {
    const createdBy = document.getElementById('createdBy').value;
    const comment = document.getElementById('comment').value || '';
    if (!createdBy) {
      alert("Created By is required.");
      return;
    }

    const groups = document.querySelectorAll('.ruleGroup');
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<CHTBillingRules createdBy="${createdBy}" date="${new Date().toISOString().split('T')[0]}">\n\t<Comment>${comment}</Comment>\n`;

    groups.forEach(group => {
      const startDate = group.querySelector('.startDate').value;
      const endDate = group.querySelector('.endDate').value;
      const enabled = group.querySelector('.enabled').value;

      xml += `\t<RuleGroup startDate="${startDate}"${endDate ? ` endDate="${endDate}"` : ''}${enabled === "false" ? ` enabled="false"` : ''}>\n`;

      const rules = group.querySelectorAll('.rule');
      rules.forEach(rule => {
        const name = rule.querySelector('.ruleName').value;
        const adj = rule.querySelector('.billingAdjustment').value || '0.00';
        const type = rule.querySelector('.billingRuleType').value;
        const dataTransfer = rule.querySelector('.includeDataTransfer').value;
        const rip = rule.querySelector('.includeRIPurchases').value;
        const product = rule.querySelector('.productName').value || 'ANY';

        const prodDT = rule.querySelector('.productIncludeDataTransfer').value;
        const prodRIP = rule.querySelector('.productIncludeRIPurchases').value;
        const region = rule.querySelector('.region').value;

        xml += `\t\t<BillingRule name="${name}" includeDataTransfer="${dataTransfer}"${rip === "true" ? ` includeRIPurchases="true"` : ''}>\n`;
        xml += `\t\t\t<BasicBillingRule billingAdjustment="${adj}" billingRuleType="${type}"/>\n`;
        xml += `\t\t\t<Product productName="${product}"${prodDT ? ` includeDataTransfer="${prodDT}"` : ''}${prodRIP ? ` includeRIPurchases="${prodRIP}"` : ''}>`;

        let subTags = '';

        if (region) subTags += `\n\t\t\t\t<Region name="${region}"/>`;

        const usageTypes = rule.querySelectorAll('.usageTypes .usageTypeName');
        usageTypes.forEach(typeEl => {
          const usageName = typeEl.value.trim();
          if (usageName) subTags += `\n\t\t\t\t<UsageType name="${usageName}"/>`;
        });

        const lineItems = rule.querySelectorAll('.lineItemDescriptions .sub-entry');
        lineItems.forEach
