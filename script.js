//Add Rule Group Button

function addRuleGroup(afterElement = null, insertAtTop = false) {
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
        <button onclick="addRule(this)" style="margin-right: 15px;">Add Billing Rule</button>
        <button onclick="addRuleGroup(this.parentElement)" style="margin-right: 15px;">Add Rule Group</button>
        <button class="remove-rule-group" onclick="this.parentElement.remove()" style="margin-right: 15px;">Remove Rule Group</button>
  `;

    const container = document.getElementById('groupsContainer');

    if (insertAtTop) {
        container.insertBefore(div, container.firstChild);
    } else if (afterElement) {
        container.insertBefore(div, afterElement.nextSibling);
    } else {
        container.appendChild(div);
    }
}

// Add Billing Rule Button

function addRule(button) {
    const rulesContainer = button.previousElementSibling;
    const div = document.createElement('div');
    div.className = 'rule';
    div.innerHTML = `
        <label>Billing Rule Name:</label>
        <input type="text" class="ruleName" placeholder="Enter Billing Rule name" />
        <br>
        <label>Billing Adjustment:</label>
        <input type="int" class="billingAdjustment" placeholder="e.g. 0.00"/>

        <label>Billing Rule Type:</label>
        <select class="billingRuleType">
        <option value="percentDiscount">percentDiscount</option>
        <option value="percentIncrease">percentIncrease</option>
        <option value="fixedRate">fixedRate</option>
        </select>
        
  <label class="includeDataTransfer">Include Data Transfer:</label>
    <select class="includeDataTransfer">
      <option value="true">true</option>
      <option value="false">false</option>
    </select>
  <label class="includeRIPurchases">Include RI Purchases:</label>
    <select class="includeRIPurchases">
      <option value="true">true</option>
      <option value="false" selected>false</option>
    </select>
    <br>

        <label>Product Name:</label>
        <input type="text" class="productName" list="productList" placeholder="Leave empty for Any Products" />
        <datalist id="productList">
        <option value="Amazon API Gateway" />
        <option value="Amazon AppFlow" />
        <option value="Amazon AppStream" />
        <option value="Amazon Athena" />
        <option value="Amazon Bedrock" />
        <option value="Amazon Chime" />
        <option value="Amazon CloudFront" />
        <option value="Amazon CloudSearch" />
        <option value="Amazon CodeWhisperer" />
        <option value="Amazon Cognito" />
        <option value="Amazon Comprehend" />
        <option value="Amazon Connect" />
        <option value="Amazon DataZone" />
        <option value="Amazon Detective" />
        <option value="Amazon DevOps Guru" />
        <option value="Amazon DocumentDB (with MongoDB compatibility)" />
        <option value="Amazon DynamoDB" />
        <option value="Amazon EC2" />
        <option value="Amazon EC2 Container Registry (ECR)" />
        <option value="Amazon Elastic Compute Cloud" />
        <option value="Amazon Elastic Container Registry Public" />
        <option value="Amazon Elastic Container Service" />
        <option value="Amazon Elastic Container Service for Kubernetes" />
        <option value="Amazon Elastic File System" />
        <option value="Amazon Elastic MapReduce" />
        <option value="Amazon Elastic Transcoder" />
        <option value="Amazon ElastiCache" />
        <option value="Amazon FSx" />
        <option value="Amazon Glacier" />
        <option value="Amazon GuardDuty" />
        <option value="Amazon HealthLake" />
        <option value="Amazon Inspector" />
        <option value="Amazon Interactive Video Service" />
        <option value="Amazon Kendra" />
        <option value="Amazon Keyspaces (for Apache Cassandra)" />
        <option value="Amazon Kinesis" />
        <option value="Amazon Kinesis Analytics" />
        <option value="Amazon Kinesis Firehose" />
        <option value="Amazon Lambda" />
        <option value="Amazon Lex" />
        <option value="Amazon Lightsail" />
        <option value="Amazon Location Service" />
        <option value="Amazon Machine Learning" />
        <option value="Amazon Macie" />
        <option value="Amazon Managed Blockchain" />
        <option value="Amazon Managed Grafana" />
        <option value="Amazon Managed Service for Prometheus" />
        <option value="Amazon Managed Streaming for Apache Kafka" />
        <option value="Amazon Managed Workflows for Apache Airflow" />
        <option value="Amazon Mechanical Turk" />
        <option value="Amazon Mechanical Turk Worker Rewards" />
        <option value="Amazon MemoryDB" />
        <option value="Amazon MQ" />
        <option value="Amazon Neptune" />
        <option value="Amazon Omics" />
        <option value="Amazon OpenSearch Service" />
        <option value="Amazon Personalize" />
        <option value="Amazon Polly" />
        <option value="Amazon Q" />
        <option value="Amazon Quantum Ledger Database" />
        <option value="Amazon QuickSight" />
        <option value="Amazon RDS" />
        <option value="Amazon Redshift" />
        <option value="Amazon Registrar" />
        <option value="Amazon Rekognition" />
        <option value="Amazon Relational Database Service" />
        <option value="Amazon Route 53" />
        <option value="Amazon S3" />
        <option value="Amazon S3 Glacier Deep Archive" />
        <option value="Amazon SageMaker" />
        <option value="Amazon Security Lake" />
        <option value="Amazon Simple Email Service" />
        <option value="Amazon Simple Notification Service" />
        <option value="Amazon Simple Queue Service" />
        <option value="Amazon Simple Storage Service" />
        <option value="Amazon Simple Workflow Service" />
        <option value="Amazon SimpleDB" />
        <option value="Amazon Textract" />
        <option value="Amazon Timestream" />
        <option value="Amazon Transcribe" />
        <option value="Amazon Translate" />
        <option value="Amazon Verified Permissions" />
        <option value="Amazon Virtual Private Cloud" />
        <option value="Amazon VPC" />
        <option value="Amazon WorkDocs" />
        <option value="Amazon WorkSpaces" />
        <option value="Amazon WorkSpaces Web" />
        <option value="AmazonCloudWatch" />
        <option value="AmazonWorkMail" />
        <option value="AWS Amplify" />
        <option value="AWS App Runner" />
        <option value="AWS AppSync" />
        <option value="AWS Application Migration Service" />
        <option value="AWS Audit Manager" />
        <option value="AWS Backup" />
        <option value="AWS Billing Conductor" />
        <option value="AWS Budgets" />
        <option value="AWS Certificate Manager" />
        <option value="AWS Cloud Map" />
        <option value="AWS Cloud WAN" />
        <option value="AWS CloudFormation" />
        <option value="AWS CloudHSM" />
        <option value="AWS CloudShell" />
        <option value="AWS CloudTrail" />
        <option value="AWS CodeArtifact" />
        <option value="AWS CodeBuild" />
        <option value="AWS CodeCommit" />
        <option value="AWS CodePipeline" />
        <option value="AWS Compute Optimizer" />
        <option value="AWS Config" />
        <option value="AWS Cost Explorer" />
        <option value="AWS Data Pipeline" />
        <option value="AWS Data Transfer" />
        <option value="AWS Database Migration Service" />
        <option value="AWS DataSync" />
        <option value="AWS DeepRacer" />
        <option value="AWS Device Farm" />
        <option value="AWS Direct Connect" />
        <option value="AWS Directory Service" />
        <option value="AWS Elemental MediaConnect" />
        <option value="AWS Elemental MediaConvert" />
        <option value="AWS Elemental MediaLive" />
        <option value="AWS Elemental MediaStore" />
        <option value="AWS End User Messaging" />
        <option value="AWS Firewall Manager" />
        <option value="AWS Global Accelerator" />
        <option value="AWS Glue" />
        <option value="AWS HealthImaging" />
        <option value="AWS Identity and Access Management Access Analyzer" />
        <option value="AWS IoT" />
        <option value="AWS IoT Device Defender" />
        <option value="AWS IoT Device Management" />
        <option value="AWS IoT Events" />
        <option value="AWS IoT TwinMaker" />
        <option value="AWS Key Management Service" />
        <option value="AWS Lambda" />
        <option value="AWS Migration Hub Refactor Spaces" />
        <option value="AWS Network Firewall" />
        <option value="AWS Payment Cryptography" />
        <option value="AWS Route 53 Application Recovery Controller" />
        <option value="AWS Secrets Manager" />
        <option value="AWS Security Hub" />
        <option value="AWS Service Catalog" />
        <option value="AWS Shield" />
        <option value="AWS Skill Builder Individual" />
        <option value="AWS Step Functions" />
        <option value="AWS Storage Gateway" />
        <option value="AWS Support (Business)" />
        <option value="AWS Support (Developer)" />
        <option value="AWS Support (Enterprise)" />
        <option value="AWS Premium Support" />
        <option value="AWS Systems Manager" />
        <option value="AWS Telco Network Builder" />
        <option value="AWS Transfer Family" />
        <option value="AWS WAF" />
        <option value="AWS X-Ray" />
        <option value="CloudWatch Events" />
        <option value="CodeBuild" />
        <option value="Contact Lens for Amazon Connect" />
        <option value="DynamoDB Accelerator (DAX)" />
        <option value="Elastic Load Balancing" />
        <option value="Savings Plans for AWS Compute usage" />
        <option value="Savings Plans for AWS Machine Learning" />
        </datalist>
    <Label class="includeDataTransfer">Product Include Data Transfer:</label>
      <select class="productIncludeDataTransfer">
        <option value="">(inherit)</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>

    <label class="includeRIPurchases">Product Include RI Purchases:</label>
      <select class="productIncludeRIPurchases">
        <option value="">(inherit)</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>

    <br>
        <!-- Region -->
        <label>Region (optional):</label>
        <input type="text" class="region" />

        <!-- usageType -->
        <div class="sub-group">
        <label>Usage Types:</label>
        <div class="usageTypes"></div>
        <div class="sub-entry">
            <button class="addUsageType" type="button" onclick="addUsageType(this)">+</button>
        </div>
        </div>

        <!-- Operation -->
        <div class="sub-group">
        <label>Operations:</label>
        <div class="operations"></div>
        <div class="sub-entry">
            <button class="addOperation" type="button" onclick="addOperation(this)">+</button>
        </div>
        </div>

        <!-- RecordType -->
        <div class="sub-group">
        <label>Record Types:</label>
        <div class="recordTypes"></div>
        <div class="sub-entry">
            <button class="addRecordType" type="button" onclick="addRecordType(this)">+</button>
        </div>
        </div>

        <!-- InstanceProperties -->
        <div class="sub-group">
        <label>Instance Properties:</label>
        <div class="instanceProperties"></div>
        <div class="sub-entry">
            <button class="addInstanceProperty" type="button" onclick="addInstanceProperty(this)">+</button>
        </div>
        </div>

        <!-- LineItemDescription -->
        <div class="sub-group">
        <label>Line Item Descriptions:</label>
        <div class="lineItemDescriptions"></div>
        <div class="sub-entry">
            <button class="addLineItem" type="button" onclick="addLineItemDescription(this)">+</button>
        </div>
        </div>

        <!-- SavingsPlanOfferingType -->
        <div class="sub-group">
        <label>Savings Plan Offering Types:</label>
        <div class="savingsPlanOfferingTypes"></div>
        <div class="sub-entry">
            <button class="addSavingsPlanOfferingType" type="button" onclick="addSavingsPlanOfferingType(this)">+</button>
        </div>
        </div>


        <button class="remove-rule" onclick="this.parentElement.remove()">Remove Billing Rule</button>
      `;
    rulesContainer.appendChild(div);
}

function addUsageType(button) {
    const container = button.closest('.sub-group').querySelector('.usageTypes');
    const div = document.createElement('div');
    div.className = 'sub-entry';
    div.innerHTML = `
        <button type="button" class="remove-usagetype" onclick="this.parentElement.remove()">×</button>
        <input type="text" class="usageTypeName" placeholder="UsageType name..." />
      `;
    container.appendChild(div);
}

function addLineItemDescription(button) {
    const container = button.closest('.sub-group').querySelector('.lineItemDescriptions');
    const div = document.createElement('div');
    div.className = 'sub-entry';
    div.innerHTML = `
        <button type="button" class="remove-lineitem" onclick="this.parentElement.remove()">×</button>
        <select class="lineItemType">
          <option value="contains">contains</option>
          <option value="startsWith">startsWith</option>
          <option value="matchesRegex">matchesRegex</option>
        </select>
        <input type="text" class="lineItemValue" placeholder="Enter LineItem Description..." />
      `;
    container.appendChild(div);
}

function addOperation(button) {
    const container = button.closest('.sub-group').querySelector('.operations');
    const div = document.createElement('div');
    div.className = 'sub-entry';
    div.innerHTML = `
    <button type="button" class="remove-lineitem" onclick="this.parentElement.remove()">×</button>
    <input type="text" class="operationName" placeholder="Enter Operation name..." />
  `;
    container.appendChild(div);
}
function addRecordType(button) {
    const container = button.closest('.sub-group').querySelector('.recordTypes');
    const div = document.createElement('div');
    div.className = 'sub-entry';
    div.innerHTML = `
    <button type="button" class="remove-lineitem" onclick="this.parentElement.remove()">×</button>
    <input type="text" class="recordTypeName" placeholder="Enter RecordType..." />
  `;
    container.appendChild(div);
}
function addInstanceProperty(button) {
    const container = button.closest('.sub-group').querySelector('.instanceProperties');
    const div = document.createElement('div');
    div.className = 'sub-entry';
    div.innerHTML = `
        <button type="button" class="remove-lineitem" onclick="this.parentElement.remove()">×</button>
        <input type="text" class="instanceType" placeholder="Instance Type (e.g., t2)" />
        <input type="text" class="instanceSize" placeholder="Instance Size (e.g., 8xlarge)" />
        <div class="checkbox-wrapper">
        <input type="checkbox" class="reservedInstance" id="reservedInstance" />
        <label for="reservedInstance" class="checkbox-label"> Reserved</label>
        </div>
  `;
    container.appendChild(div);
}
function addSavingsPlanOfferingType(button) {
    const container = button.closest('.sub-group').querySelector('.savingsPlanOfferingTypes');
    const div = document.createElement('div');
    div.className = 'sub-entry';
    div.innerHTML = `
    <button type="button" class="remove-lineitem" onclick="this.parentElement.remove()">×</button>
    <input type="text" class="savingsPlanOfferingTypeName" placeholder="Enter Savings Plan Offering Type..." />
  `;
    container.appendChild(div);
}

//Export XML Button Function

function generateXML() {
    const createdByInput = document.getElementById('createdBy');
    const createdBy = createdByInput.value;
    const comment = document.getElementById('comment').value || '';

    if (!createdBy) {
        alert("Created By is required.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        createdByInput.style.border = '2px solid red';
        createdByInput.focus();
        return;
    }
    createdByInput.style.border = '';

    const groups = document.querySelectorAll('.ruleGroup');
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<CHTBillingRules createdBy="${createdBy}" date="${new Date().toISOString().split('T')[0]}">\n\t<Comment>${comment}</Comment>\n`;

    groups.forEach(group => {
        let startDate = group.querySelector('.startDate').value;
        if (!startDate) {
            const now = new Date();
            startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        }
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

            rule.querySelectorAll('.usageTypes .usageTypeName').forEach(el => {
                const val = el.value.trim();
                if (val) subTags += `\n\t\t\t\t<UsageType name="${val}"/>`;
            });

            rule.querySelectorAll('.operations .operationName').forEach(el => {
                const val = el.value.trim();
                if (val) subTags += `\n\t\t\t\t<Operation name="${val}"/>`;
            });

            rule.querySelectorAll('.recordTypes .recordTypeName').forEach(el => {
                const val = el.value.trim();
                if (val) subTags += `\n\t\t\t\t<RecordType name="${val}"/>`;
            });

            rule.querySelectorAll('.instanceProperties .sub-entry').forEach(entry => {
                const type = entry.querySelector('.instanceType').value.trim();
                const size = entry.querySelector('.instanceSize').value.trim();
                const reserved = entry.querySelector('.reservedInstance').checked;

                if (type || size || reserved === false || reserved === true) {
                    subTags += `\n\t\t\t\t<InstanceProperties`;
                    if (type) subTags += ` instanceType="${type}"`;
                    if (size) subTags += ` instanceSize="${size}"`;
                    subTags += ` reserved="${reserved ? 'true' : 'false'}"`;
                    subTags += ` />`;
                }
            });

            rule.querySelectorAll('.lineItemDescriptions .sub-entry').forEach(item => {
                const key = item.querySelector('.lineItemType').value;
                const val = item.querySelector('.lineItemValue').value;
                if (val) subTags += `\n\t\t\t\t<LineItemDescription ${key}="${val}" />`;
            });

            rule.querySelectorAll('.savingsPlanOfferingTypes .savingsPlanOfferingTypeName').forEach(el => {
                const val = el.value.trim();
                if (val) subTags += `\n\t\t\t\t<SavingsPlanOfferingType name="${val}"/>`;
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

//ExportJSON Function

function exportJSON() {
    const bookNameInput = document.getElementById('bookName');
    const bookName = bookNameInput.value.trim();

    if (!bookName) {
        alert("Price Book Name is required.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        bookNameInput.style.border = '2px solid red';
        bookNameInput.focus();
        return;
    } else {
        bookNameInput.style.border = '';
    }
    document.getElementById('outputXML').value = '';
    if (typeof generateXML === 'function') {
        generateXML();
    }

    const xml = document.getElementById('outputXML').value;
    if (!xml) {
        alert("Failed to generate XML.");
        return;
    }

    const escapedXML = xml.replace(/"/g, '\\"');
    const json = `{"book_name":"${bookName}","specification":"${escapedXML}"}`;
    document.getElementById('outputJSON').value = json;
    updateAssignCustomerJSON('<PriceBookID_From_Previous_Command_Output>');
    updateAssignCustomerAccountJSON('<PriceBookAssignmentID_From_Previous_Command_Output>');
}

// Export for Terminal Function

function exportForTerminal() {
    const bookNameInput = document.getElementById('bookName');
    const bookName = bookNameInput.value.trim();

    if (!bookName) {
        alert("Price Book Name is required.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        bookNameInput.style.border = '2px solid red';
        bookNameInput.focus();
        return;
    } else {
        bookNameInput.style.border = '';
    }
    document.getElementById('outputXML').value = '';
    if (typeof generateXML === 'function') {
        generateXML();
    }

    const xml = document.getElementById('outputXML').value;
    if (!xml) {
        alert("Failed to generate XML.");
        return;
    }

    const escapedXML = xml.replace(/"/g, '\\"');
    const jsonPayload = `{"book_name":"${bookName}","specification":"${escapedXML}"}`;

    const curlCommand = `curl -X POST https://chapi.cloudhealthtech.com/v1/price_books \\\n` +
        `  -H "Authorization: Bearer <YOUR_API_TOKEN>" \\\n` +
        `  -H "Content-Type: application/json" \\\n` +
        `  -d '${jsonPayload}'`;

    document.getElementById('outputJSON').value = curlCommand;
    updateAssignCustomerCurl('<PriceBookID_From_Previous_Command_Output>');
    updateAssignCustomerAccountCurl('<PriceBookAssignmentID_From_Previous_Command_Output>');
}

//Assign CPB to Customer JSON
function updateAssignCustomerJSON(priceBookId) {
    const cxAPIIdInput = document.getElementById('cxAPIId').value.trim();
    const clientAPIId = cxAPIIdInput !== '' ? cxAPIIdInput : '<Enter ClientAPI ID>';

    const payload = {
        price_book_id: priceBookId,
        target_client_api_id: clientAPIId
    };

    const assignCustomerArea = document.getElementById('assignCustomerJSON');
    assignCustomerArea.value = JSON.stringify(payload, null, 2);
}
//Assign CPB to Customer CURL
function updateAssignCustomerCurl(priceBookId) {
    const cxAPIIdInput = document.getElementById('cxAPIId').value.trim();
    const clientAPIId = cxAPIIdInput !== '' ? cxAPIIdInput : '<Enter ClientAPI ID>';

    const curlCommand = `curl -X POST https://chapi.cloudhealthtech.com/v1/price_book_assignments \\
  -H "Authorization: Bearer <YOUR_API_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "price_book_id": "${priceBookId}",
    "target_client_api_id": "${clientAPIId}"
}'`;

    const assignCustomerArea = document.getElementById('assignCustomerJSON');
    assignCustomerArea.value = curlCommand;
}

//Assign CPB to Customer Account JSON
function updateAssignCustomerAccountJSON(priceBookAssignmentId) {
    const cxAPIIdInput = document.getElementById('cxAPIId').value.trim();
    const cxPayerIdInput = document.getElementById('cxPayerId').value.trim();

    const clientAPIId = cxAPIIdInput !== '' ? cxAPIIdInput : '<Enter ClientAPI ID>';

    //Split billing_account_owner_id by commas, trim each, filter empty values
    let billingAccountOwnerIdArray = [];

    if (cxPayerIdInput === '') {
        billingAccountOwnerIdArray = ["ALL"];
    } else {
        billingAccountOwnerIdArray = cxPayerIdInput
            .split(',')
            .map(id => id.trim())
            .filter(id => id !== '');
    }

    const jsonContent = {
        price_book_assignment_id: priceBookAssignmentId,
        billing_account_owner_id: billingAccountOwnerIdArray,
        target_client_api_id: clientAPIId
    };

    const assignCustomerAccountArea = document.getElementById('assignCustomerAccountJSON');
    assignCustomerAccountArea.value = JSON.stringify(jsonContent, null, 2); // Pretty print JSON
}


//Assign CPB to Customer Account CURL
function updateAssignCustomerAccountCurl(priceBookAssignmentId) {
    const cxAPIIdInput = document.getElementById('cxAPIId').value.trim();
    const cxPayerIdInput = document.getElementById('cxPayerId').value.trim();

    const clientAPIId = cxAPIIdInput !== '' ? cxAPIIdInput : '<Enter ClientAPI ID>';

    let billingAccountOwnerIdArray = [];

    if (cxPayerIdInput === '') {
        billingAccountOwnerIdArray = ["ALL"];
    } else {
        billingAccountOwnerIdArray = cxPayerIdInput
            .split(',')
            .map(id => id.trim())
            .filter(id => id !== '');
    }

    const billingAccountOwnerIdJSON = JSON.stringify(billingAccountOwnerIdArray);

    const curlCommand = `curl -X POST https://chapi.cloudhealthtech.com/v1/price_book_account_assignments \\
  -H "Authorization: Bearer <YOUR_API_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "price_book_assignment_id": "${priceBookAssignmentId}",
    "billing_account_owner_id": ${billingAccountOwnerIdJSON},
    "target_client_api_id": "${clientAPIId}"
}'`;

    const assignCustomerAccountArea = document.getElementById('assignCustomerAccountJSON');
    assignCustomerAccountArea.value = curlCommand;
}

//import file function

document.getElementById('importButton').addEventListener('click', function () {
    document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', function (event) {
    document.getElementById('outputXML').value = '';
    document.getElementById('outputJSON').value = '';
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const result = e.target.result;

            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                let jsonContent = null;
                let xmlString = null;

                try {
                    // First attempt normal JSON parsing
                    jsonContent = JSON.parse(result);
                    xmlString = jsonContent.specification;
                } catch (err) {
                    console.warn('Standard JSON.parse failed. Attempting to extract XML manually...');

                    // Manual fallback: extract "book_name" and "specification" manually
                    const bookNameMatch = result.match(/"book_name"\s*:\s*"([^"]*)"/);
                    const specStart = result.indexOf('"specification"');
                    const specColon = result.indexOf(':', specStart);
                    const specQuoteStart = result.indexOf('"', specColon + 1);

                    if (specStart !== -1 && specColon !== -1 && specQuoteStart !== -1) {
                        let specContent = result.substring(specQuoteStart + 1);

                        // Find last closing quote safely (ignore any escaped quotes)
                        let specQuoteEnd = specContent.lastIndexOf('"');
                        while (specContent[specQuoteEnd - 1] === '\\') {
                            // If the quote is escaped, keep looking left
                            specQuoteEnd = specContent.lastIndexOf('"', specQuoteEnd - 2);
                        }

                        specContent = specContent.substring(0, specQuoteEnd);

                        // Unescape backslash-escaped characters
                        xmlString = specContent
                            .replace(/\\"/g, '"')
                            .replace(/\\n/g, '\n')
                            .replace(/\\t/g, '\t')
                            .replace(/\\\\/g, '\\');

                        jsonContent = {
                            book_name: bookNameMatch ? bookNameMatch[1] : 'Unknown'
                        };
                    } else {
                        alert('Failed to extract XML from malformed JSON.');
                        return;
                    }
                }

                if (xmlString) {
                    populateFieldsFromXMLString(xmlString, jsonContent);
                } else {
                    alert('Could not find specification data.');
                }

            } else if (file.type === 'text/xml' || file.name.endsWith('.xml')) {
                populateFieldsFromXMLString(result);
            } else {
                alert('Unsupported file format. Please upload a JSON or XML file.');
            }
        };

        reader.readAsText(file);
    }
});

function populateFieldsFromXMLString(xmlString, jsonContent = null) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

    const bookNameValue = jsonContent ? jsonContent.book_name : '';
    document.getElementById('bookName').value = bookNameValue;

    const createdByValue = jsonContent ? jsonContent.createdBy : xmlDoc.documentElement.getAttribute('createdBy');
    document.getElementById('createdBy').value = createdByValue || '';

    const comment = xmlDoc.querySelector('Comment')?.textContent || '';
    document.getElementById('comment').value = comment;

    document.getElementById('groupsContainer').innerHTML = '';

    const ruleGroups = xmlDoc.getElementsByTagName('RuleGroup');
    Array.from(ruleGroups).forEach(ruleGroup => {
        addRuleGroup();
        const currentGroup = document.querySelector('.ruleGroup:last-child');

        currentGroup.querySelector('.startDate').value = ruleGroup.getAttribute('startDate');
        currentGroup.querySelector('.endDate').value = ruleGroup.getAttribute('endDate');
        currentGroup.querySelector('.enabled').value = ruleGroup.getAttribute('enabled') || 'true';

        const billingRules = ruleGroup.getElementsByTagName('BillingRule');
        Array.from(billingRules).forEach(billingRule => {
            addRule(currentGroup.querySelector('button'));
            const currentRule = currentGroup.querySelector('.rule:last-child');

            currentRule.querySelector('.ruleName').value = billingRule.getAttribute('name');
            currentRule.querySelector('.billingAdjustment').value = billingRule.getElementsByTagName('BasicBillingRule')[0].getAttribute('billingAdjustment');
            currentRule.querySelector('.billingRuleType').value = billingRule.getElementsByTagName('BasicBillingRule')[0].getAttribute('billingRuleType');
            currentRule.querySelector('.includeDataTransfer').value = billingRule.getAttribute('includeDataTransfer');
            currentRule.querySelector('.includeRIPurchases').value = billingRule.getAttribute('includeRIPurchases');

            const product = billingRule.getElementsByTagName('Product')[0];
            if (product) {
                currentRule.querySelector('.productName').value = product.getAttribute('productName');
                currentRule.querySelector('.productIncludeDataTransfer').value = product.getAttribute('includeDataTransfer');
                currentRule.querySelector('.productIncludeRIPurchases').value = product.getAttribute('includeRIPurchases');

                const region = product.getElementsByTagName('Region')[0];
                if (region) {
                    currentRule.querySelector('.region').value = region.getAttribute('name');
                }

                populateSubEntries(currentRule.querySelector('.usageTypes'), product.getElementsByTagName('UsageType'), 'name', addUsageType);
                populateSubEntries(currentRule.querySelector('.operations'), product.getElementsByTagName('Operation'), 'name', addOperation);
                populateSubEntries(currentRule.querySelector('.recordTypes'), product.getElementsByTagName('RecordType'), 'name', addRecordType);

                Array.from(product.getElementsByTagName('InstanceProperties')).forEach(instanceProperty => {
                    addInstanceProperty(currentRule.querySelector('.instanceProperties + .sub-entry button'));
                    const newInstance = currentRule.querySelector('.instanceProperties .sub-entry:last-child');
                    newInstance.querySelector('.instanceType').value = instanceProperty.getAttribute('instanceType');
                    newInstance.querySelector('.instanceSize').value = instanceProperty.getAttribute('instanceSize');
                    const reservedAttr = instanceProperty.getAttribute('reserved');
                    newInstance.querySelector('.reservedInstance').checked = reservedAttr === 'true';
                });

                Array.from(product.getElementsByTagName('LineItemDescription')).forEach(lineItem => {
                    addLineItemDescription(currentRule.querySelector('.lineItemDescriptions + .sub-entry button'));
                    const newDescription = currentRule.querySelector('.lineItemDescriptions .sub-entry:last-child');
                    ['contains', 'startsWith', 'matchesRegex'].forEach(type => {
                        if (lineItem.getAttribute(type)) {
                            newDescription.querySelector('.lineItemType').value = type;
                            newDescription.querySelector('.lineItemValue').value = lineItem.getAttribute(type);
                        }
                    });
                });

                populateSubEntries(currentRule.querySelector('.savingsPlanOfferingTypes'), product.getElementsByTagName('SavingsPlanOfferingType'), 'name', addSavingsPlanOfferingType);
            }
        });
    });
}

function populateSubEntries(container, xmlElements, attrName, addFunction, specificAttrs = []) {
    Array.from(xmlElements).forEach(element => {
        const button = container.nextElementSibling.querySelector('button');
        addFunction(button);
        const newEntry = container.querySelector('.sub-entry:last-child');
        if (attrName) {
            newEntry.querySelector('input').value = element.getAttribute(attrName) || '';
        } else if (specificAttrs.length) {
            specificAttrs.forEach(attr => {
                const input = newEntry.querySelector(`.${attr}`);
                if (attr === 'reserved') {
                    input.checked = element.getAttribute(attr) === 'true';
                } else {
                    input.value = element.getAttribute(attr) || '';
                }
            });
        }
    });
}

//copy to clipBoard function

function copyToClipboard(textareaId) {
    const textarea = document.getElementById(textareaId);
    textarea.select();
    textarea.setSelectionRange(0, 99999); // For mobile
    document.execCommand("copy");
}
//Download output
function downloadText(textareaId, extension) {
    const text = document.getElementById(textareaId).value;
    const nameInput = document.getElementById('bookName');
    let base = nameInput ? nameInput.value.trim() : 'output';
    if (!base) base = 'output';

    // Sanitize filename
    base = base.replace(/[^\w\-]/g, '_');

    // Add date timestamp
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${base}_${timestamp}.${extension}`;

    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}
//info button
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('infoButton').addEventListener('click', function () {
        var infoModal = document.getElementById('infoModal');
        infoModal.style.display = 'block';
        document.getElementById('infoContent').innerHTML = `
        <p><strong>Rule Order:</strong> Custom price book XML specifications process rules in top-down order. The first applicable rule that satisfies all specified constraints for a line item is used, and then no subsequent rules are used for that line item. If no applicable and matching rule is found, the line item will have a 0% calculated price adjustment.</p>
        <p><strong>Rule Applicability:</strong> Rule applicability is determined by the startDate and endDate attributes in enabled RuleGroup elements. startDates and endDates are inclusive. Whether or not an applicable rule is actually used depends on its order relative to other rules and the constraints it specifies for matching line items.</p>
        <p><strong>For more details:</strong> <a href="https://apidocs.cloudhealthtech.com/#price-book_introduction-to-price-book-api" target="_blank" style="color: #4ca1af;">API Documentation</a></p>
      `;
    });

    window.closeModal = function () {
        document.getElementById('infoModal').style.display = 'none';
    };
});
