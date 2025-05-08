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
        <button onclick="addRule(this)">Add Billing Rule</button>
        <button onclick="this.parentElement.remove()">Remove Rule Group</button>
      `;
      document.getElementById('groupsContainer').appendChild(div);
    }

    function addRule(button) {
      const rulesContainer = button.previousElementSibling;
      const div = document.createElement('div');
      div.className = 'rule';
      div.innerHTML = `
        <label>Billing Rule Name:</label>
        <input type="text" class="ruleName" placeholder="Enter Billing Rule name" />

        <label>Billing Adjustment (e.g. 0.00):</label>
        <input type="int" class="billingAdjustment" />

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
          lineItems.forEach(item => {
            const key = item.querySelector('.lineItemType').value;
            const val = item.querySelector('.lineItemValue').value;
            if (val) subTags += `\n\t\t\t\t<LineItemDescription ${key}="${val}" />`;
          });

          if (subTags) {
            xml += `${subTags}\n\t\t\t</Product>\n`;
          } else {
            xml += `</Product>\n`;
          }

          xml += `\t\t</BillingRule>\n`;
        });

        xml += `\t</RuleGroup>\n`;
      });

      xml += `</CHTBillingRules>`;
      document.getElementById('outputXML').value = xml;
    }

    function exportJSON() {
      const bookName = document.getElementById('bookName').value.trim();
      const xml = document.getElementById('outputXML').value;

      if (!bookName) {
        alert("Book Name is required.");
        return;
      }

      if (!xml) {
        alert("Generate XML before exporting JSON.");
        return;
      }

      const escapedXML = xml.replace(/"/g, '\\"');
      const json = `{"book_name":"${bookName}","specification":"${escapedXML}"}`;
      document.getElementById('outputJSON').value = json;
    }
