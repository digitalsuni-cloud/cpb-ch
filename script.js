async 
                }
            } else if (attempts >= maxAttempts) {
                clearInterval(checkAndRun);
                console.warn("Timed out waiting for XML to generate.");
            }
        }, 100);
    }

    // === Assign to Read Out Pricebook button ===
  const readOutBtn = document.getElementById('readOutBtn');
  if (readOutBtn) {
    readOutBtn.addEventListener('click', generateAndThenSummarize);
  }
    // === Assign same to Refresh button ===

  const refreshBtn = document.getElementById('refreshNLBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', generateAndThenSummarize);
  }

    // === Collapse/Expand NL Summary ===
    const toggleNLBtn = document.getElementById('toggleNLBtn');
    if (toggleNLBtn) {
        toggleNLBtn.addEventListener('click', function () {
            const nlArea = document.getElementById('nlContentArea');
            if (!nlArea) return;
            if (nlArea.style.display === 'none') {
                nlArea.style.display = '';
                toggleNLBtn.textContent = '🔽';
            } else {
                nlArea.style.display = 'none';
                toggleNLBtn.textContent = '▶';
            }
        });
    }
});


 else {
        body.setAttribute('data-theme', 'dark');
    }
}
function validateForm() {
    let isValid = true;
    let firstInvalidField = null;
    const requiredFields = ['bookName', 'createdBy'];

    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(`${fieldId}-error`);

        if (!field.value.trim()) {
            isValid = false;
            field.setAttribute('aria-invalid', 'true');
            errorElement.textContent = 'This field is required.';
            errorElement.style.display = 'block';
            field.style.border = '2px solid red';
            if (!firstInvalidField) firstInvalidField = field;
        } else {
            field.removeAttribute('aria-invalid');
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            field.style.border = '';
        }
    });

    if (firstInvalidField) {
        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalidField.focus();
    }

    return isValid;
}

function initializePropertySelector(select) {
    if (!select) return;
    select.innerHTML = '<option value="">Select a property to add</option>';
    for (const [key, value] of Object.entries(propertyTypes)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = value.name;
        select.appendChild(option);
    }
}

//Add Rule Group
function addRuleGroup(afterElement = null, insertAtTop = false) {
    const div = document.createElement('div');
    div.className = 'rule-group';
    const groupId = 'group-' + Date.now();
    div.id = groupId;
    div.innerHTML = `
            <div class="rule-group-header">
                <h3>Rule Group</h3>
                <div class="input-row always-visible">
                    <div class="input-group">
                        <label for="startDate-${groupId}">Start Date</label>
                        <input type="date" id="startDate-${groupId}" required oninput="updateNavigation()">
                    </div>
                    <div class="input-group">
                        <label for="endDate-${groupId}">End Date (Optional)</label>
                        <input type="date" id="endDate-${groupId}" oninput="updateNavigation()">
                    </div>
                    <div class="input-group">
                       <label for="payerAccounts-${groupId}">PayerAccount ID (Optional)</label>
                       <input type="text" id="payerAccounts-${groupId}" placeholder="Enter PayerAccount ID (optional)">
                    </div>
                    <div class="input-group">
                        <label for="enabled-${groupId}">Enabled</label>
                        <select id="enabled-${groupId}">
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>
                    <button class="collapse-button" onclick="toggleRuleGroupCollapse(this)">▼</button>
                </div>
            </div>
            <div class="rule-group-content">
                <div class="rules"></div>
                <div class="button-group">
                    <button onclick="addRule(this)" class="button">
                        <span class="button-icon">➕</span>Add Billing Rule
                    </button>
                    <button onclick="addRuleGroup(this.closest('.rule-group'))" class="button">
                        <span class="button-icon">➕</span>Add Rule Group
                    </button>
                    <button class="button button-red" onclick="removeRuleGroup(this)">
                        <span class="button-icon">×</span>Remove Rule Group
                    </button>
                </div>
            </div>
        `;

    const container = document.getElementById('groupsContainer');

    if (insertAtTop) {
        container.insertBefore(div, container.firstChild);
    } else if (afterElement) {
        container.insertBefore(div, afterElement.nextSibling);
    } else {
        container.appendChild(div);
    }

    // Update navigation after adding the group
    setTimeout(updateNavigation, 0);
}

function removeRuleGroup(button) {
    const ruleGroup = button.closest('.rule-group');
    if (ruleGroup) {
        ruleGroup.remove();
        setTimeout(updateNavigation, 0);
    }
}

//Add Billing Rule
function addRule(button) {
    const rulesContainer = button.closest('.rule-group').querySelector('.rules');
    const div = document.createElement('div');
    div.className = 'rule';
    const ruleId = 'rule-' + Date.now();
    div.id = ruleId;
    div.innerHTML = `
                <div class="rule-header">
                    <h4>Billing Rule</h4>
                    <div class="input-group always-visible">
                        <label>Billing Rule Name</label>
                        <div class="input-with-button">
                            <input type="text" class="ruleName" placeholder="Enter Billing Rule name" />
                            <button class="collapse-button" onclick="toggleBillingRuleCollapse(this)">▼</button>
                        </div>
                    </div>
                </div>
                <div class="rule-content">
                    <div class="billing-rule-inline">
                <div class="input-group">
                    <label>Billing Adjustment</label>
                    <input type="number" class="billingAdjustment" placeholder="e.g. 0.00"/>
                </div>
                <div class="input-group">
                    <label>Billing Rule Type</label>
                    <select class="billingRuleType">
                        <option value="percentDiscount">percentDiscount</option>
                        <option value="percentIncrease">percentIncrease</option>
                        <option value="fixedRate">fixedRate</option>
                    </select>
                </div>
                <div class="input-group compact">
                    <label>Include Data Transfer</label>
                    <select class="includeDataTransfer">
                        <option value="true">true</option>
                        <option value="false">false</option>
                    </select>
                </div>
                <div class="input-group compact">
                    <label>Include RI Purchases</label>
                    <select class="includeRIPurchases">
                        <option value="true">true</option>
                        <option value="false" selected>false</option>
                    </select>
                </div>
            </div>
                <div class="product-inline">
                    <div class="input-group">
                        <label>Product Name</label>
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
                    </div>
                    <div class="input-group compact">
                        <label>Product Include Data Transfer</label>
                        <select class="productIncludeDataTransfer">
                            <option value="">(inherit)</option>
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </select>
                    </div>
                    <div class="input-group compact">
                        <label>Product Include RI Purchases</label>
                        <select class="productIncludeRIPurchases">
                            <option value="">(inherit)</option>
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </select>
                    </div>
                </div>
       <!-- Active Properties Section -->
        <div class="active-properties">
            <h2>Active Product Property Filters</h2>
            <div class="property-tags" id="activeTags">
                <!-- Tags will be populated by JavaScript -->
            </div>
        </div>

        <!-- Property Selector -->
        <div class="property-selector">
            <select class="propertySelect">
                <option value="">Select a property to add</option>
            </select>
            <button onclick="addSelectedProperty('${ruleId}')">Add Property</button>
        </div>

        <!-- Property Sections -->
        <div class="propertySections">
            <!-- Property sections will be dynamically added here -->
        </div>
                <button class="button button-red" onclick="removeRule(this)">
                    <span class="button-icon">×</span>Remove Billing Rule
                </button>
            `;
    rulesContainer.appendChild(div);
    initializePropertySelector(div.querySelector('.propertySelect'));

    // Update navigation after adding the rule
    setTimeout(updateNavigation, 0);

    // Add event listener for rule name changes
    const ruleNameInput = div.querySelector('.ruleName');
    ruleNameInput.addEventListener('input', updateNavigation);
}

// Initialize navigation on page load
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(updateNavigation, 0);
});
function removeRule(button) {
    const rule = button.closest('.rule');
    if (rule) {
        rule.remove();
        setTimeout(updateNavigation, 0);
    }
}

// Rules Navigation Bar function

function updateNavigation() {
    const ruleSearch = $('#ruleSearch');
    if (!ruleSearch.length) return;

    // Clear existing options
    ruleSearch.empty();

    // Add a default placeholder option
    ruleSearch.append(new Option('Select or search for a Billing rule...', '', true, true));

    document.querySelectorAll('.rule-group').forEach((ruleGroup, groupIndex) => {
        const startDate = ruleGroup.querySelector('input[type="date"][id^="startDate-"]').value || '(noStartDate)';
        const endDate = ruleGroup.querySelector('input[type="date"][id^="endDate-"]').value || '(noEndDate)';

        ruleGroup.querySelectorAll('.rule').forEach((rule, ruleIndex) => {
            const fullRuleName = rule.querySelector('.ruleName').value || `Rule ${groupIndex + 1}.${ruleIndex + 1}`;
            let ruleName = fullRuleName;

            // Truncate rule name if it's too long
            const maxLength = 80;
            if (ruleName.length > maxLength) {
                ruleName = ruleName.substring(0, maxLength) + '...';
            }

            const ruleIdentifier = `${groupIndex + 1}.${ruleIndex + 1}`;
            const optionText = `${ruleIdentifier} - ${ruleName} -> ${startDate} to ${endDate}`;

            // Add option to Select2
            const option = new Option(optionText, rule.id, false, false);

            // Add title attribute for hover tooltip showing full name
            option.title = `${fullRuleName} -> ${startDate} to ${endDate}`;

            ruleSearch.append(option);
        });
    });

    // Initialize or update Select2
    ruleSearch.select2({
        placeholder: 'Select or search for a Billing rule...',
        width: '100%',
        allowClear: false,
        theme: 'classic',
        dropdownParent: document.querySelector('.rule-nav'),
        containerCssClass: 'select2-container--full-width',
        dropdownCssClass: 'select2-dropdown--full-width',
        templateResult: formatRuleOption,
        templateSelection: formatRuleOption,
        minimumResultsForSearch: 6
    });

    // Handle selection
    ruleSearch.off('select2:select').on('select2:select', function (e) {
        const ruleId = e.params.data.id;
        const selectedRule = document.getElementById(ruleId);
        if (selectedRule) {
            expandAndScrollToRule(selectedRule);
        }
    });

    // Add placeholder to search field when dropdown is opened
    ruleSearch.off('select2:open').on('select2:open', function (e) {
        $('.select2-search__field').attr('placeholder', 'Type to search...');
    });

    // Handle dropdown closing
    ruleSearch.off('select2:close').on('select2:close', function (e) {
        if (!ruleSearch.val()) {
            ruleSearch.val(null).trigger('change');
        }
    });

    // Restore previous selection if it exists
    const previousSelection = ruleSearch.val();
    if (previousSelection) {
        ruleSearch.val(previousSelection).trigger('change');
    }
}

// Function to format the rule option with tooltip
function formatRuleOption(rule) {
    if (!rule.id) {
        return rule.text;
    }
    var $rule = $('<span title="' + rule.title + '">' + rule.text + '</span>');
    return $rule;
}

// Function to expand and scroll to the selected rule
function expandAndScrollToRule(rule) {
    // Expand parent rule group if collapsed
    const ruleGroup = rule.closest('.rule-group');
    const ruleGroupContent = ruleGroup.querySelector('.rule-group-content');
    const ruleGroupButton = ruleGroup.querySelector('.rule-group-header .collapse-button');

    if (ruleGroupContent.classList.contains('collapsed')) {
        ruleGroupContent.classList.remove('collapsed');
        ruleGroupButton.classList.remove('collapsed');
        ruleGroupButton.textContent = '▼';
    }

    // Expand the rule if collapsed
    const ruleContent = rule.querySelector('.rule-content');
    const ruleButton = rule.querySelector('.rule-header .collapse-button');

    if (ruleContent.classList.contains('collapsed')) {
        ruleContent.classList.remove('collapsed');
        ruleButton.classList.remove('collapsed');
        ruleButton.textContent = '▼';
    }

    // Scroll to the rule
    rule.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function expandAndScrollToRule(rule) {
    // First, expand the parent rule group if it's collapsed
    const ruleGroup = rule.closest('.rule-group');
    const ruleGroupContent = ruleGroup.querySelector('.rule-group-content');
    const ruleGroupButton = ruleGroup.querySelector('.rule-group-header .collapse-button');

    if (ruleGroupContent.classList.contains('collapsed')) {
        ruleGroupContent.classList.remove('collapsed');
        ruleGroupButton.classList.remove('collapsed');
        ruleGroupButton.textContent = '▼';
    }

    // Then, expand the billing rule if it's collapsed
    const ruleContent = rule.querySelector('.rule-content');
    const ruleButton = rule.querySelector('.rule-header .collapse-button');

    if (ruleContent.classList.contains('collapsed')) {
        ruleContent.classList.remove('collapsed');
        ruleButton.classList.remove('collapsed');
        ruleButton.textContent = '▼';
    }

    // Finally, scroll to the rule
    rule.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToBottom() {
    window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
    });
}

// Initialize navigation on page load
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(updateNavigation, 0);
});

// Property types configuration
const propertyTypes = {
    region: { name: 'Region', type: 'standard' },
    usageType: { name: 'Usage Type', type: 'standard' },
    operation: { name: 'Operation', type: 'standard' },
    recordType: { name: 'Record Type', type: 'standard' },
    instanceProperty: { name: 'Instance Property', type: 'instance' },
    lineItemDescription: { name: 'Line Item Description', type: 'lineItem' },
    savingsPlanOfferingType: { name: 'Savings Plan Offering Type', type: 'standard' }
};

// Track added properties
let addedProperties = new Set();

// Track expanded state
let expandedSections = new Set();

// Initialize UI
function initializeUI() {
    addRuleGroup(null, true); // Add an initial rule group
    initializePropertySelector();
}

function addSelectedProperty(ruleId) {
    const rule = document.getElementById(ruleId);
    const select = rule.querySelector('.propertySelect');
    const propertyType = select.value;
    if (propertyType) {
        // Collapse all expanded sections in this rule
        rule.querySelectorAll('.property-content.expanded').forEach(content => {
            content.classList.remove('expanded');
        });

        removeUnusedProperties(rule);
        if (!rule.addedProperties) {
            rule.addedProperties = new Set();
        }
        if (!rule.addedProperties.has(propertyType)) {
            addPropertySection(propertyType, rule);
            rule.addedProperties.add(propertyType);
            addValue(propertyType, rule);

            // Expand the newly added property section
            const newContent = rule.querySelector(`#${propertyType}Content`);
            if (newContent) {
                newContent.classList.add('expanded');
            }
        }
        updatePropertySelect(select);
    }
}

function removeUnusedProperties(rule) {
    if (!rule.addedProperties) return;
    rule.addedProperties.forEach(propertyType => {
        const status = rule.querySelector(`#${propertyType}Status`);
        if (status && status.textContent === 'Not in use') {
            const section = rule.querySelector(`#${propertyType}Section`);
            if (section) {
                section.remove();
                rule.addedProperties.delete(propertyType);
            }
        }
    });
    updatePropertySelect(rule.querySelector('.propertySelect'));
}

function addPropertySection(propertyType, rule) {
    const container = rule.querySelector('.propertySections');
    const section = document.createElement('div');
    section.className = 'property-section';
    section.id = `${propertyType}Section`;

    const header = document.createElement('div');
    header.className = 'property-header';
    header.style.cursor = 'pointer';
    header.onclick = () => toggleSection(propertyType, rule);
    header.innerHTML = `
                    <div class="header-content">
                        <h5>${propertyTypes[propertyType].name}</h5>
                        <span class="status" id="${propertyType}Status">Not in use</span>
                    </div>
                `;

    const content = document.createElement('div');
    content.className = 'property-content';
    content.id = `${propertyType}Content`;

    const valuesContainer = document.createElement('div');
    valuesContainer.id = `${propertyType}Values`;

    const addButton = document.createElement('button');
    addButton.className = 'add-value';
    addButton.textContent = `Add ${propertyTypes[propertyType].name}`;
    addButton.onclick = (e) => {
        e.stopPropagation();
        addValue(propertyType, rule);
    };

    content.appendChild(valuesContainer);
    content.appendChild(addButton);

    section.appendChild(header);
    section.appendChild(content);
    container.appendChild(section);

    toggleSection(propertyType, rule);
}

// Update toggleSection function to work with both scenarios
function toggleSection(propertyType, rule) {
    // If rule is provided, use it to find the content, otherwise use document.getElementById
    const content = rule ?
        rule.querySelector(`#${propertyType}Content`) :
        document.getElementById(`${propertyType}Content`);

    if (!content) return;

    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        if (rule && !rule.expandedSections) {
            rule.expandedSections = new Set();
        }
        if (rule) {
            rule.expandedSections.delete(propertyType);
        }
    } else {
        content.classList.add('expanded');
        if (rule && !rule.expandedSections) {
            rule.expandedSections = new Set();
        }
        if (rule) {
            rule.expandedSections.add(propertyType);
        }
    }
}

function addValue(propertyType, rule) {
    const container = rule.querySelector(`#${propertyType}Values`);
    const div = document.createElement('div');

    switch (propertyTypes[propertyType].type) {
        case 'standard':
            div.className = 'property-value';
            div.innerHTML = `
                <input type="text" placeholder="Enter ${propertyTypes[propertyType].name}" 
                       onchange="updatePropertyStatus('${propertyType}', this)">
                <button onclick="removeValue(this, '${propertyType}')">×</button>
            `;
            break;
        case 'instance':
            div.className = 'instance-property-value';
            div.innerHTML = `
                <input type="text" placeholder="Instance Type" onchange="updatePropertyStatus('${propertyType}', this)">
                <input type="text" placeholder="Instance Size" onchange="updatePropertyStatus('${propertyType}', this)">
                <select onchange="updatePropertyStatus('${propertyType}', this)">
                    <option value="false">Not Reserved</option>
                    <option value="true">Reserved</option>
                </select>
                <button onclick="removeValue(this, '${propertyType}')">×</button>
            `;
            break;
        case 'lineItem':
            div.className = 'line-item-description-value';
            div.innerHTML = `
                <select onchange="updatePropertyStatus('${propertyType}', this)">
                    <option value="contains">Contains</option>
                    <option value="startsWith">Starts With</option>
                    <option value="matchesRegex">Matches Regex</option>
                </select>
                <input type="text" placeholder="Enter description" onchange="updatePropertyStatus('${propertyType}', this)">
                <button onclick="removeValue(this, '${propertyType}')">×</button>
            `;
            break;
    }

    container.appendChild(div);
    updatePropertyStatus(propertyType, rule);
}

function removeValue(button, propertyType) {
    const element = button.closest('.property-value, .instance-property-value, .line-item-description-value');
    const rule = button.closest('.rule');
    if (element) {
        element.remove();
        updatePropertyStatus(propertyType, rule.querySelector(`#${propertyType}Values`));
    }
}

function updatePropertyStatus(propertyType, element) {
    const rule = element.closest('.rule');
    const container = rule.querySelector(`#${propertyType}Values`);
    let hasValues = false;
    let valueCount = 0;

    if (propertyTypes[propertyType].type === 'instance') {
        const instanceSets = container.querySelectorAll('.instance-property-value');
        instanceSets.forEach(set => {
            const inputs = set.querySelectorAll('input');
            if (Array.from(inputs).some(input => input.value.trim() !== '')) {
                hasValues = true;
                valueCount++;
            }
        });
    } else {
        const inputs = container.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.value.trim() !== '') {
                hasValues = true;
                valueCount++;
            }
        });
    }

    const status = rule.querySelector(`#${propertyType}Status`);
    status.textContent = hasValues ? 'In use' : 'Not in use';
    status.className = `status ${hasValues ? 'active' : ''}`;

    updateActiveTags(rule);
}


function updateActiveTags(rule) {
    const container = rule.querySelector('.property-tags');
    container.innerHTML = '';

    if (!rule.addedProperties) return;

    rule.addedProperties.forEach(propertyType => {
        const valueContainer = rule.querySelector(`#${propertyType}Values`);
        let activeCount = 0;

        if (propertyTypes[propertyType].type === 'instance') {
            const instanceSets = valueContainer.querySelectorAll('.instance-property-value');
            instanceSets.forEach(set => {
                const inputs = set.querySelectorAll('input');
                if (Array.from(inputs).some(input => input.value.trim() !== '')) {
                    activeCount++;
                }
            });
        } else {
            const inputs = valueContainer.querySelectorAll('input');
            activeCount = Array.from(inputs).filter(input => input.value.trim() !== '').length;
        }

        if (activeCount > 0) {
            const tag = document.createElement('div');
            tag.className = 'property-tag';
            tag.onclick = () => {
                const content = rule.querySelector(`#${propertyType}Content`);
                if (content) {
                    content.classList.toggle('expanded');
                }
            };
            tag.innerHTML = `
                ${propertyTypes[propertyType].name}
                <span class="count">${activeCount}</span>
            `;
            container.appendChild(tag);
        }
    });
}

function updatePropertySelect(select) {
    if (!select) return;
    const rule = select.closest('.rule');
    Array.from(select.options).forEach(option => {
        option.disabled = rule.addedProperties && rule.addedProperties.has(option.value);
    });
    select.value = '';
}
document.addEventListener('DOMContentLoaded', initializeUI);

function addSavingsPlanOfferingType(button) {
    const container = button.closest('.sub-group').querySelector('.savingsPlanOfferingTypes');
    const div = document.createElement('div');
    div.className = 'sub-entry';
    div.innerHTML = `
        <button type="button" class="small-button" onclick="this.parentElement.remove()">×</button>
        <input type="text" class="savingsPlanOfferingTypeName" placeholder="Enter Savings Plan Offering Type..." />
    `;
    container.appendChild(div);
}


// Updated generateOutput to return a Promise that resolves after the async timeout


// XML Generator
function generateXML() {
    if (!validateForm()) {
        alert("Please fill in all required fields.");
        return;
    }

    const createdByInput = document.getElementById('createdBy');
    const createdBy = createdByInput.value;
    const comment = document.getElementById('comment').value || '';
    const groups = document.querySelectorAll('.rule-group');
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<CHTBillingRules createdBy="${createdBy}" date="${new Date().toISOString().split('T')[0]}">\n\t<Comment>${comment}</Comment>\n`;

    groups.forEach(group => {
        let startDate = group.querySelector('[id^="startDate-"]').value;
        if (!startDate) {
            const now = new Date();
            startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        }
        const endDate = group.querySelector('[id^="endDate-"]').value;
        const enabled = group.querySelector('[id^="enabled-"]').value;
        const payerAccounts = group.querySelector('[id^="payerAccounts-"]').value.trim();  // Fetch and trim for safety

        xml += `\t<RuleGroup startDate="${startDate}"${endDate ? ` endDate="${endDate}"` : ''}${payerAccounts ? ` payerAccounts="${payerAccounts}"` : ''}${enabled === "false" ? ` enabled="false"` : ''}>\n`;

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

            xml += `\t\t<BillingRule name="${name}" includeDataTransfer="${dataTransfer}"${rip === "true" ? ` includeRIPurchases="true"` : ''}>\n`;
            xml += `\t\t\t<BasicBillingRule billingAdjustment="${adj}" billingRuleType="${type}"/>\n`;
            xml += `\t\t\t<Product productName="${product}"${prodDT ? ` includeDataTransfer="${prodDT}"` : ''}${prodRIP ? ` includeRIPurchases="${prodRIP}"` : ''}>`;

            let subTags = '';

            // Proper order of properties
            const propertyOrder = [
                'region',
                'usageType',
                'operation',
                'recordType',
                'instanceProperty',
                'lineItemDescription',
                'savingsPlanOfferingType'
            ];

            // Safely collect addedProperties
            const addedSet = new Set();
            if (rule.addedProperties && typeof rule.addedProperties.forEach === 'function') {
                rule.addedProperties.forEach(p => addedSet.add(p));
            }

            propertyOrder.forEach(propertyType => {
                if (!addedSet.has(propertyType)) return;

                const valuesContainer = rule.querySelector(`#${propertyType}Values`);
                if (!valuesContainer) return;

                switch (propertyType) {
                    case 'region':
                        valuesContainer.querySelectorAll('.property-value input').forEach(input => {
                            const val = input.value.trim();
                            if (val) subTags += `\n\t\t\t\t<Region name="${val}"/>`;
                        });
                        break;

                    case 'usageType':
                        valuesContainer.querySelectorAll('.property-value input').forEach(input => {
                            const val = input.value.trim();
                            if (val) subTags += `\n\t\t\t\t<UsageType name="${val}"/>`;
                        });
                        break;

                    case 'operation':
                        valuesContainer.querySelectorAll('.property-value input').forEach(input => {
                            const val = input.value.trim();
                            if (val) subTags += `\n\t\t\t\t<Operation name="${val}"/>`;
                        });
                        break;

                    case 'recordType':
                        valuesContainer.querySelectorAll('.property-value input').forEach(input => {
                            const val = input.value.trim();
                            if (val) subTags += `\n\t\t\t\t<RecordType name="${val}"/>`;
                        });
                        break;

                    case 'instanceProperty':
                        valuesContainer.querySelectorAll('.instance-property-value').forEach(entry => {
                            const inputs = entry.querySelectorAll('input');
                            const select = entry.querySelector('select');
                            const type = inputs[0].value.trim();
                            const size = inputs[1].value.trim();
                            const reserved = select.value === 'true';

                            if (type || size || reserved) {
                                subTags += `\n\t\t\t\t<InstanceProperties`;
                                if (type) subTags += ` instanceType="${type}"`;
                                if (size) subTags += ` instanceSize="${size}"`;
                                subTags += ` reserved="${reserved}"`;
                                subTags += ` />`;
                            }
                        });
                        break;

                    case 'lineItemDescription':
                        valuesContainer.querySelectorAll('.line-item-description-value').forEach(entry => {
                            const select = entry.querySelector('select');
                            const input = entry.querySelector('input');
                            const key = select.value;
                            const val = input.value.trim();
                            if (val) subTags += `\n\t\t\t\t<LineItemDescription ${key}="${val}" />`;
                        });
                        break;

                    case 'savingsPlanOfferingType':
                        valuesContainer.querySelectorAll('.property-value input').forEach(input => {
                            const val = input.value.trim();
                            if (val) subTags += `\n\t\t\t\t<SavingsPlanOfferingType name="${val}"/>`;
                        });
                        break;
                }
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
    return xml;
}

//JSON Generator
function generateJSON() {
    if (!validateForm()) {
        alert("Please fill in all required fields.");
        return;
    }
    const bookNameInput = document.getElementById('bookName');
    const bookName = bookNameInput.value.trim();

    const xml = generateXML();
    if (!xml) {
        alert("Failed to generate XML.");
        return;
    }

    // Populate the XML text area
    const xmlOutput = document.getElementById('xmlOutput');
    if (xmlOutput) {
        xmlOutput.value = xml;
    }

    const escapedXML = xml.replace(/"/g, '\\"');
    return `{"book_name":"${bookName}","specification":"${escapedXML}"}`;
}

function generateCURL() {
    const jsonPayload = generateJSON();
    if (!jsonPayload) return;

    // Populate the JSON text area
    const jsonOutput = document.getElementById('jsonOutput');
    if (jsonOutput) {
        jsonOutput.value = jsonPayload;
    }

    // Generate the cURL command
    const curlCommand = `curl -X POST https://chapi.cloudhealthtech.com/v1/price_books \\\n` +
        `  -H "Authorization: Bearer <YOUR_API_TOKEN>" \\\n` +
        `  -H "Content-Type: application/json" \\\n` +
        `  -d '${jsonPayload}'`;

    return curlCommand;
}

function updateAssignCustomerJSON(priceBookId) {
    const cxAPIIdInput = document.getElementById('cxAPIId').value.trim();
    const clientAPIId = cxAPIIdInput !== '' ? cxAPIIdInput : '<Enter ClientAPI ID>';

    const payload = {
        price_book_id: priceBookId,
        target_client_api_id: clientAPIId
    };

    document.getElementById('assignCustomerJSON').value = JSON.stringify(payload, null, 2);
}

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

    document.getElementById('assignCustomerJSON').value = curlCommand;
}

function updateAssignCustomerAccountJSON(priceBookAssignmentId) {
    const cxAPIIdInput = document.getElementById('cxAPIId').value.trim();
    const cxPayerIdInput = document.getElementById('cxPayerId').value.trim();
    const clientAPIId = cxAPIIdInput !== '' ? cxAPIIdInput : '<Enter ClientAPI ID>';

    let billingAccountOwnerIdArray = cxPayerIdInput === ''
        ? ["ALL"]
        : cxPayerIdInput.split(',').map(id => id.trim()).filter(id => id !== '');

    const jsonContent = {
        price_book_assignment_id: priceBookAssignmentId,
        billing_account_owner_id: billingAccountOwnerIdArray,
        target_client_api_id: clientAPIId
    };

    document.getElementById('assignCustomerAccountJSON').value = JSON.stringify(jsonContent, null, 2);
}

function updateAssignCustomerAccountCurl(priceBookAssignmentId) {
    const cxAPIIdInput = document.getElementById('cxAPIId').value.trim();
    const cxPayerIdInput = document.getElementById('cxPayerId').value.trim();
    const clientAPIId = cxAPIIdInput !== '' ? cxAPIIdInput : '<Enter ClientAPI ID>';

    let billingAccountOwnerIdArray = cxPayerIdInput === ''
        ? ["ALL"]
        : cxPayerIdInput.split(',').map(id => id.trim()).filter(id => id !== '');

    const billingAccountOwnerIdJSON = JSON.stringify(billingAccountOwnerIdArray);

    const curlCommand = `curl -X POST https://chapi.cloudhealthtech.com/v1/price_book_account_assignments \\
  -H "Authorization: Bearer <YOUR_API_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "price_book_assignment_id": "${priceBookAssignmentId}",
    "billing_account_owner_id": ${billingAccountOwnerIdJSON},
    "target_client_api_id": "${clientAPIId}"
  }'`;

    document.getElementById('assignCustomerAccountJSON').value = curlCommand;
}

function copyOutput(elementId) {
    const outputElement = document.getElementById(elementId);
    outputElement.select();
    document.execCommand('copy');
}

function downloadOutput(elementId, fileType) {
    const content = document.getElementById(elementId).value;
    const nameInput = document.getElementById('bookName');
    let base = nameInput ? nameInput.value.trim() : 'price_book';
    if (!base) base = 'price_book';

    // Sanitize filename
    base = base.replace(/[^\w\-]/g, '_');

    // Add date timestamp
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${base}_${timestamp}.${fileType}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function showLoadingIndicator() {
    document.querySelector('.loading-indicator').classList.add('active');
}

function hideLoadingIndicator() {
    document.querySelector('.loading-indicator').classList.remove('active');
}

document.getElementById('helpButton').addEventListener('click', () => {
    const modal = document.getElementById('helpModal');
    const content = document.getElementById('helpContent');
    content.innerHTML = `
                <p><strong>Rule Order:</strong> Custom price book XML specifications process rules in top-down order. The first applicable rule that satisfies all specified constraints for a line item is used, and then no subsequent rules are used for that line item. If no applicable and matching rule is found, the line item will have a 0% calculated price adjustment.</p>
                <p><strong>Rule Applicability:</strong> Rule applicability is determined by the startDate and endDate attributes in enabled RuleGroup elements. startDates and endDates are inclusive. Whether or not an applicable rule is actually used depends on its order relative to other rules and the constraints it specifies for matching line items.</p>
                <p><strong>For more details:</strong> <a href="https://apidocs.cloudhealthtech.com/#price-book_introduction-to-price-book-api" target="_blank" style="color: #4ca1af;">API Documentation</a></p>
            `;
    modal.style.display = 'block';
});

function closeModal() {
    document.getElementById('helpModal').style.display = 'none';
}

// Import Price Book function
document.getElementById('importButton').addEventListener('click', function () {
    const mainFields = ['bookName', 'createdBy', 'comment', 'cxAPIId', 'cxPayerId'];
    const allFieldsEmpty = mainFields.every(fieldId => document.getElementById(fieldId).value.trim() === '');
    const noRuleGroups = document.getElementById('groupsContainer').children.length === 0;

    if (allFieldsEmpty && noRuleGroups) {
        // If all fields are empty and there are no rule groups, import without prompting
        document.getElementById('fileInput').click();
    } else {
        // If there's data, prompt for confirmation
        if (confirm('Importing a price book will clear the existing data in the form. Do you want to continue?')) {
            document.getElementById('fileInput').click();
        }
    }
});

document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result || '';
            // Reset all fields and clear all rule groups before import
            performReset();  // Assuming performReset() is defined elsewhere; if not, use resetAllFields()

            detectAndImport(text);
        };
        reader.readAsText(file);
    }
});

// Content sniffing + dispatch
function detectAndImport(text) {
    let trimmed = (text || '').trim();

    // Trim UTF-8 BOM if present
    if (trimmed.charCodeAt(0) === 0xFEFF) {
        trimmed = trimmed.slice(1);
    }

    if (!trimmed) {
        alert('The file is empty.');
        return;
    }

    // Quick sniff by first non-whitespace char
    const firstChar = trimmed[0];

    if (firstChar === '{' || firstChar === '[') {
        // Likely JSON
        const ok = tryImportAsJSON(trimmed);
        if (!ok) {
            // If strict JSON parse failed, try XML as a fallback
            const okXML = tryImportAsXML(trimmed);
            if (!okXML) alert('Unable to parse file as JSON or XML.');
        }
        return;
    }

    if (firstChar === '<') {
        // Likely XML
        const okXML = tryImportAsXML(trimmed);
        if (!okXML) {
            // Maybe it’s JSON with leading BOM/spaces? Try JSON as fallback
            const okJSON = tryImportAsJSON(trimmed);
            if (!okJSON) alert('Unable to parse file as XML or JSON.');
        }
        return;
    }

    // Heuristics when first char is ambiguous
    if (looksLikeJSON(trimmed)) {
        const ok = tryImportAsJSON(trimmed);
        if (ok) return;
    }
    if (looksLikeXML(trimmed)) {
        const ok = tryImportAsXML(trimmed);
        if (ok) return;
    }

    // As a last attempt, try both with error-guard
    if (!tryImportAsJSON(trimmed) && !tryImportAsXML(trimmed)) {
        alert('Unsupported or invalid file content. Please upload a valid JSON or XML.');
    }
}

function looksLikeJSON(s) {
    // Quick heuristic: presence of quotes-colon pairs and curly braces
    return /["']\s*:\s*/.test(s) && /[{[]/.test(s);
}

function looksLikeXML(s) {
    // Quick heuristic: starts with < and has matching tag patterns
    return /^<\?xml|^<\w+[\s>]/.test(s);
}

// Strict JSON import with your existing logic + fallback extraction
function tryImportAsJSON(text) {
    try {
        const obj = JSON.parse(text);
        // Your JSON format expects an embedded XML under "specification"
        const xmlString = obj && obj.specification;
        if (typeof xmlString === 'string' && xmlString.trim().startsWith('<')) {
            handleJSONImportWithXML(obj, xmlString);
            return true;
        }
        // If your JSON ever evolves to carry all fields directly, add that handler here
        alert('JSON parsed but no "specification" XML found.');
        return false;
    } catch (e) {
        // Attempt your manual extraction approach
        const extracted = extractXMLFromMalformedJSON(text);
        if (extracted) {
            handleJSONImportWithXML({ book_name: extracted.bookName || 'Unknown' }, extracted.xml);
            return true;
        }
        return false;
    }
}

function handleJSONImportWithXML(jsonContent, xmlString) {
    // Keep existing behavior: populate from XML, use JSON fields where applicable
    populateFieldsFromXMLString(xmlString, jsonContent);
}

// Your existing manual extraction, made into a helper
function extractXMLFromMalformedJSON(raw) {
    try {
        const bookNameMatch = raw.match(/"book_name"\s*:\s*"([^"]*)"/);
        const specKeyMatch = raw.match(/"specification"\s*:\s*"/);
        if (!specKeyMatch) return null;

        const startIndex = specKeyMatch.index + specKeyMatch[0].length;
        // Parse a JSON string value, honoring escapes
        let i = startIndex;
        let xml = '';
        let escaped = false;
        while (i < raw.length) {
            const ch = raw[i];
            if (!escaped && ch === '"') break; // end of string
            if (!escaped && ch === '\\') {
                escaped = true;
            } else {
                xml += ch;
                escaped = false;
            }
            i++;
        }
        // Unescape common sequences
        xml = xml
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');

        return { xml, bookName: bookNameMatch ? bookNameMatch[1] : undefined };
    } catch {
        return null;
    }
}

// XML import with robust parsererror detection
function tryImportAsXML(text) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'application/xml');
    const parseError = xmlDoc.getElementsByTagName('parsererror')[0];

    if (parseError) {
        return false;
    }

    handleXMLImport(text);
    return true;
}

function resetAllFields() {
    // Clear main fields
    document.getElementById('bookName').value = '';
    document.getElementById('createdBy').value = '';
    document.getElementById('comment').value = '';
    document.getElementById('cxAPIId').value = '';
    document.getElementById('cxPayerId').value = '';

    // Clear all rule groups
    document.getElementById('groupsContainer').innerHTML = '';

    // Clear all output areas
    document.getElementById('xmlOutput').value = '';
    document.getElementById('jsonOutput').value = '';
    document.getElementById('assignCustomerJSON').value = '';
    document.getElementById('assignCustomerAccountJSON').value = '';

    // Remove any error styling
    document.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
}

function handleXMLImport(result) {
    populateFieldsFromXMLString(result);
}

function handleJSONImport(result) {
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
}

function populateFieldsFromXMLString(xmlString, jsonContent = null) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

    const bookNameValue = jsonContent ? jsonContent.book_name : '';
    document.getElementById('bookName').value = bookNameValue;

    const createdByValue = xmlDoc.documentElement.getAttribute('createdBy');
    document.getElementById('createdBy').value = createdByValue || '';

    const comment = xmlDoc.querySelector('Comment')?.textContent || '';
    document.getElementById('comment').value = comment;

    document.getElementById('groupsContainer').innerHTML = '';

    const ruleGroups = xmlDoc.getElementsByTagName('RuleGroup');
    Array.from(ruleGroups).forEach(ruleGroup => {
        addRuleGroup();
        const currentGroup = document.querySelector('.rule-group:last-child');

        currentGroup.querySelector('[id^="startDate-"]').value = ruleGroup.getAttribute('startDate');
        currentGroup.querySelector('[id^="endDate-"]').value = ruleGroup.getAttribute('endDate');
        currentGroup.querySelector('[id^="payerAccounts-"]').value = ruleGroup.getAttribute('payerAccounts') || '';
        currentGroup.querySelector('[id^="enabled-"]').value = ruleGroup.getAttribute('enabled') || 'true';

        const billingRules = ruleGroup.getElementsByTagName('BillingRule');
        Array.from(billingRules).forEach(billingRule => {
            const addRuleButton = currentGroup.querySelector('button');
            addRule(addRuleButton);

            const currentRule = currentGroup.querySelector('.rule:last-child');
            currentRule.addedProperties = new Set();

            currentRule.querySelector('.ruleName').value = billingRule.getAttribute('name');
            const basicBillingRule = billingRule.getElementsByTagName('BasicBillingRule')[0];
            currentRule.querySelector('.billingAdjustment').value = basicBillingRule.getAttribute('billingAdjustment');
            currentRule.querySelector('.billingRuleType').value = basicBillingRule.getAttribute('billingRuleType');
            currentRule.querySelector('.includeDataTransfer').value = billingRule.getAttribute('includeDataTransfer');
            currentRule.querySelector('.includeRIPurchases').value = billingRule.getAttribute('includeRIPurchases') || 'false';

            const product = billingRule.getElementsByTagName('Product')[0];
            if (product) {
                currentRule.querySelector('.productName').value = product.getAttribute('productName');
                currentRule.querySelector('.productIncludeDataTransfer').value = product.getAttribute('includeDataTransfer') || '';
                currentRule.querySelector('.productIncludeRIPurchases').value = product.getAttribute('includeRIPurchases') || '';

                initializePropertySelector(currentRule.querySelector('.propertySelect'));
                importProperties(product, currentRule);
            }
        });
    });

    // After all DOM updates, collapse all properties
    setTimeout(collapseAllProperties, 0);
}

function importProperties(product, currentRule) {
    // Import all properties
    importProperty(product, currentRule, 'Region', 'region');
    importProperty(product, currentRule, 'UsageType', 'usageType');
    importProperty(product, currentRule, 'Operation', 'operation');
    importProperty(product, currentRule, 'RecordType', 'recordType');

    // Import Instance Properties
    const instanceProps = product.getElementsByTagName('InstanceProperties');
    if (instanceProps.length > 0) {
        addSelectedPropertyToRule(currentRule, 'instanceProperty');
        Array.from(instanceProps).forEach(instanceProp => {
            addValue('instanceProperty', currentRule);
            const lastSet = currentRule.querySelector('#instancePropertyValues .instance-property-value:last-child');
            if (lastSet) {
                const inputs = lastSet.querySelectorAll('input');
                inputs[0].value = instanceProp.getAttribute('instanceType') || '';
                inputs[1].value = instanceProp.getAttribute('instanceSize') || '';
                lastSet.querySelector('select').value = instanceProp.getAttribute('reserved') === 'true' ? 'true' : 'false';
            }
        });
    }

    // Import Line Item Descriptions
    const lineItems = product.getElementsByTagName('LineItemDescription');
    if (lineItems.length > 0) {
        addSelectedPropertyToRule(currentRule, 'lineItemDescription');
        Array.from(lineItems).forEach(lineItem => {
            addValue('lineItemDescription', currentRule);
            const lastSet = currentRule.querySelector('#lineItemDescriptionValues .line-item-description-value:last-child');
            if (lastSet) {
                const select = lastSet.querySelector('select');
                const input = lastSet.querySelector('input');
                ['contains', 'startsWith', 'matchesRegex'].forEach(type => {
                    if (lineItem.hasAttribute(type)) {
                        select.value = type;
                        input.value = lineItem.getAttribute(type);
                    }
                });
            }
        });
    }

    importProperty(product, currentRule, 'SavingsPlanOfferingType', 'savingsPlanOfferingType');

    // Update property statuses
    Object.keys(propertyTypes).forEach(propertyType => {
        if (currentRule.addedProperties.has(propertyType)) {
            updatePropertyStatus(propertyType, currentRule);
        }
    });
}

function importProperty(product, currentRule, xmlTag, propertyType) {
    const elements = product.getElementsByTagName(xmlTag);
    if (elements.length > 0) {
        addSelectedPropertyToRule(currentRule, propertyType);
        Array.from(elements).forEach(element => {
            addValue(propertyType, currentRule);
            const lastInput = currentRule.querySelector(`#${propertyType}Values .property-value:last-child input`);
            if (lastInput) lastInput.value = element.getAttribute('name');
        });
    }
}

function collapseAllProperties() {
    const rules = document.querySelectorAll('.rule');
    rules.forEach(rule => {
        collapseAllPropertiesInRule(rule);
    });
}

function collapseAllPropertiesInRule(rule) {
    const propertyContents = rule.querySelectorAll('.property-content');
    propertyContents.forEach(content => {
        content.classList.remove('expanded');
    });

    if (!rule.expandedSections) {
        rule.expandedSections = new Set();
    }
    rule.expandedSections.clear();

    // Update the active tags to reflect the collapsed state
    updateActiveTags(rule);
}

function addSelectedPropertyToRule(rule, propertyType) {
    if (!rule.addedProperties) {
        rule.addedProperties = new Set();
    }
    if (!rule.addedProperties.has(propertyType)) {
        addPropertySection(propertyType, rule);
        rule.addedProperties.add(propertyType);

        // Ensure the newly added section starts collapsed
        const content = rule.querySelector(`#${propertyType}Content`);
        if (content) {
            content.classList.remove('expanded');
        }
    }
}

if (!rule.addedProperties) {
    rule.addedProperties = new Set();
}
if (!rule.addedProperties.has(propertyType)) {
    addPropertySection(propertyType, rule);
    rule.addedProperties.add(propertyType);

    // Ensure the newly added section starts collapsed
    const content = rule.querySelector(`#${propertyType}Content`);
    if (content) {
        content.classList.remove('expanded');
    }
}


function toggleCollapse(button, contentSelector) {
    const content = button.closest('.rule-group, .rule').querySelector(contentSelector);
    button.classList.toggle('collapsed');
    content.classList.toggle('collapsed');

    if (button.classList.contains('collapsed')) {
        button.textContent = '▶';
    } else {
        button.textContent = '▼';
    }
}
function toggleRuleGroupCollapse(button) {
    const ruleGroup = button.closest('.rule-group');
    const content = ruleGroup.querySelector('.rule-group-content');
    button.classList.toggle('collapsed');
    content.classList.toggle('collapsed');

    if (button.classList.contains('collapsed')) {
        button.textContent = '▶';
    } else {
        button.textContent = '▼';
    }
}

function toggleBillingRuleCollapse(button) {
    const rule = button.closest('.rule');
    const content = rule.querySelector('.rule-content');
    button.classList.toggle('collapsed');
    content.classList.toggle('collapsed');

    if (button.classList.contains('collapsed')) {
        button.textContent = '▶';
    } else {
        button.textContent = '▼';
    }
}
//Rest all fields.
function resetAllFields() {
    // Check if all main fields are empty
    const mainFields = ['bookName', 'createdBy', 'comment', 'cxAPIId', 'cxPayerId'];
    const allFieldsEmpty = mainFields.every(fieldId => document.getElementById(fieldId).value.trim() === '');
    const noRuleGroups = document.getElementById('groupsContainer').children.length === 0;

    if (allFieldsEmpty && noRuleGroups) {
        // If all fields are empty and there are no rule groups, reset without prompting
        performReset();
    } else {
        // If there's data, prompt for confirmation
        if (confirm('Are you sure you want to reset all fields? This action cannot be undone.')) {
            performReset();
        }
    }
}

function performReset() {
    // Clear main fields
    ['bookName', 'createdBy', 'comment', 'cxAPIId', 'cxPayerId'].forEach(fieldId => {
        document.getElementById(fieldId).value = '';
    });

    // Clear all rule groups
    document.getElementById('groupsContainer').innerHTML = '';

    // Clear all output areas
    ['xmlOutput', 'jsonOutput', 'assignCustomerJSON', 'assignCustomerAccountJSON'].forEach(fieldId => {
        document.getElementById(fieldId).value = '';
    });

    // Remove any error styling
    document.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

    // Reset property selector and clear properties
    addedProperties.clear();
    const propertySections = document.getElementById('propertySections');
    if (propertySections) {
        propertySections.innerHTML = '';
    }
    const activeTags = document.getElementById('activeTags');
    if (activeTags) {
        activeTags.innerHTML = '';
    }
    updatePropertySelect();

    // Add initial rule group
    addRuleGroup(null, true);
}

// BELOW CODE FOR READOUT PRICEBOOK FUNCTION

// Fetch current XML, either from textarea or generate fresh
function getCurrentSpecificationXML() {
    const xmlEl = document.getElementById('xmlOutput');
    if (xmlEl && xmlEl.value && xmlEl.value.trim().startsWith('<')) {
        return xmlEl.value.trim();
    }
    // Optionally regenerate XML here if needed
    // return generateXML();
    return null;
}

// Convert billing adjustment info to human readable
function toReadableAdjustment(type, adjustment) {
    if (!type) return 'No adjustment specified';
    const adj = adjustment != null ? adjustment : 'unspecified';
    const t = type.toLowerCase();
    if (t.includes('discount')) return `a ${adj} % discount`;
    if (t.includes('increase') || t.includes('markup')) return `a ${adj} % markup`;
    if (t.includes('fixed') || t.includes('rate')) return `a fixed rate of ${adj}`;
    return `${type} set to ${adj}`;
}

// Collect property filters inside a Product node
function collectProductFilters(productEl) {
    const filters = [];

    // Collect standard filters via helper
    addNameList(productEl, 'Region', 'Region', filters);
    addNameList(productEl, 'UsageType', 'Usage Type', filters);
    addNameList(productEl, 'Operation', 'Operation', filters);
    addNameList(productEl, 'RecordType', 'Record Type', filters);

    // InstanceProperties may be multiple sets
    const instProps = Array.from(productEl.getElementsByTagName('InstanceProperties'));
    instProps.forEach(ip => {
        const t = (ip.getAttribute('instanceType') || 'any').trim();
        const s = (ip.getAttribute('instanceSize') || 'any').trim();
        const r = ip.getAttribute('reserved');
        const parts = [`instanceType=${t}`, `instanceSize=${s}`];
        if (r !== null && r !== undefined) parts.push(`reserved=${r}`);
        filters.push(`Instance with ${parts.join(', ')}`);
    });

    // LineItemDescription with operator attributes
    const descNodes = Array.from(productEl.getElementsByTagName('LineItemDescription'));
    descNodes.forEach(ld => {
        let added = false;
        ['contains', 'startsWith', 'matchesRegex'].forEach(op => {
            if (ld.hasAttribute(op)) {
                filters.push(`LineItemDescription ${op} "${ld.getAttribute(op)}"`);
                added = true;
            }
        });
        if (!added) filters.push('LineItemDescription (no operator)');
    });

    // SavingsPlanOfferingType
    addNameList(productEl, 'SavingsPlanOfferingType', 'Savings Plan Offering Type', filters);

    return filters;
}

// Helper to extract names of given tag and join them for description
function joinWithCommasAndAnd(arr) {
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return arr[0] + ' and ' + arr[1];
  return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
}

function addNameList(parent, tag, label, outputArr) {
  const nodes = Array.from(parent.getElementsByTagName(tag));
  const names = nodes.map(n => n.getAttribute('name')).filter(Boolean).map(s => s.trim());
  if (names.length > 0) {
    outputArr.push(`${label}: ${joinWithCommasAndAnd(names)}`);
  }
}

// Escape HTML for safe display
function escapeHTML(str) {
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
}

// Format lines into HTML blocks with group styling
function wrapLinesAsHTML(lines) {
    const htmlBlocks = [];
    let group = [];

    lines.forEach(line => {
        if (!line.trim()) {
            if (group.length > 0) {
                htmlBlocks.push(`<div class="rulegroup">${group.join('<br>')}</div>`);
                group = [];
            }
        } else if (line.startsWith('  ')) {
            if (line.startsWith('    ')) {
                group.push(`<div class="filters">${escapeHTML(line)}</div>`);
            } else {
                group.push(`<div class="rule">${escapeHTML(line)}</div>`);
            }
        } else {
            group.push(escapeHTML(line));
        }
    });

    if (group.length > 0) {
        htmlBlocks.push(`<div class="rulegroup">${group.join('<br>')}</div>`);
    }
    return htmlBlocks.join('\n');
}

// Main Natural Language summary
function renderNaturalLanguageSummary() {
    const outputEl = document.getElementById('nlSummary');
    if (!outputEl) return;

    const xml = getCurrentSpecificationXML();
    if (!xml) {
        outputEl.textContent = 'No price book loaded.';
        return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
        outputEl.textContent = 'Error parsing XML.';
        return;
    }

    const lines = [];
    const root = doc.documentElement;
    const bookName = (document.getElementById('bookName')?.value?.trim()) || 'Unnamed';
    const createdBy = root.getAttribute('createdBy') || 'Unknown';
    const comment = doc.querySelector('Comment')?.textContent?.trim();

    lines.push(`📖 Price Book Name is "${bookName}" and Created By "${createdBy}".`);
    if (comment) lines.push(`💡 Purpose: ${comment}`);
    lines.push('');
    lines.push("🛠 Rules are processed top-down — first match applies.");

    const groups = Array.from(doc.getElementsByTagName('RuleGroup'));
    groups.forEach((group, gi) => {
        const enabled = group.getAttribute('enabled') === 'false' ? 'Disabled' : 'Enabled';
        const start = (group.getAttribute('startDate') || 'unspecified').trim();
        const end = (group.getAttribute('endDate') || '').trim();
        const payer = group.getAttribute('payerAccounts');

        let header = `RuleGroup #${gi + 1}: (${enabled}) — Effective from ${start}`;
        if (end && end.toLowerCase() !== 'unspecified') header += ` to ${end}.`; else header += `.`;
        if (payer && payer.trim()) header += ` Applies only to Payer Account(s): ${payer}`;
        lines.push('');
        lines.push(header);

        const billingRules = Array.from(group.getElementsByTagName('BillingRule'));
        billingRules.forEach(rule => {
            const ruleName = rule.getAttribute('name') || '(Unnamed Rule)';
            const basic = rule.querySelector('BasicBillingRule');
            const type = basic?.getAttribute('billingRuleType') || '';
            const adj = basic?.getAttribute('billingAdjustment') || '';
            let adjPhrase = toReadableAdjustment(type, adj);
            if (adj && adj.trim().startsWith('-')) {
                adjPhrase += ' (Negative rate)';
            }

            const includeDT = rule.getAttribute('includeDataTransfer') === 'true';
            const includeRI = rule.getAttribute('includeRIPurchases') === 'true';

            lines.push(`• Billing Rule Name = "${ruleName}"`);
            lines.push(`→ Applies ${adjPhrase}`);
            lines.push(`→ ${includeDT ? 'Includes' : 'Excludes'} Data Transfer and ${includeRI ? 'Includes' : 'Excludes'} RI purchases line items.`);

            const product = rule.querySelector('Product');
            if (product) {
                const pname = product.getAttribute('productName') || 'ANY';
                lines.push(`Product Name = ${pname === 'ANY' ? 'All the Products' : pname}`);
                const filters = collectProductFilters(product);
                if (filters.length) {
                    lines.push('Filters:');
                    filters.forEach(f => lines.push(`- ${f}`));

                }
            }
        });
    });

    outputEl.innerHTML = wrapLinesAsHTML(lines);
}

document.addEventListener('DOMContentLoaded', function () {
    // === Theme Detection ===
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Set initial theme based on system preference
    if (prefersDark) {
        document.body.setAttribute('data-theme', 'dark');
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (e.matches) {
            document.body.setAttribute('data-theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
        }
    });

    // === Natural Language Tab Click Hook ===
    const nlTabHeader = document.querySelector('.tab-item[data-tab="nlTab"]');
    if (nlTabHeader) {
        nlTabHeader.addEventListener('click', () => {
            if (typeof renderNaturalLanguageSummary === 'function') {
                setTimeout(renderNaturalLanguageSummary, 50);
            }
        });
    }

    // === Helper: Generate XML then render summary ===
    
                }
            } else if (attempts >= maxAttempts) {
                clearInterval(checkAndRun);
                console.warn("Timed out waiting for XML to generate.");
            }
        }, 100);
    }

    // === Assign to Read Out Pricebook button ===
  const readOutBtn = document.getElementById('readOutBtn');
  if (readOutBtn) {
    readOutBtn.addEventListener('click', generateAndThenSummarize);
  }
    // === Assign same to Refresh button ===

  const refreshBtn = document.getElementById('refreshNLBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', generateAndThenSummarize);
  }

    // === Collapse/Expand NL Summary ===
    const toggleNLBtn = document.getElementById('toggleNLBtn');
    if (toggleNLBtn) {
        toggleNLBtn.addEventListener('click', function () {
            const nlArea = document.getElementById('nlContentArea');
            if (!nlArea) return;
            if (nlArea.style.display === 'none') {
                nlArea.style.display = '';
                toggleNLBtn.textContent = '🔽';
            } else {
                nlArea.style.display = 'none';
                toggleNLBtn.textContent = '▶';
            }
        });
    }
});


 else {
        body.setAttribute('data-theme', 'dark');
    }
}
function validateForm() {
    let isValid = true;
    let firstInvalidField = null;
    const requiredFields = ['bookName', 'createdBy'];

    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(`${fieldId}-error`);

        if (!field.value.trim()) {
            isValid = false;
            field.setAttribute('aria-invalid', 'true');
            errorElement.textContent = 'This field is required.';
            errorElement.style.display = 'block';
            field.style.border = '2px solid red';
            if (!firstInvalidField) firstInvalidField = field;
        } else {
            field.removeAttribute('aria-invalid');
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            field.style.border = '';
        }
    });

    if (firstInvalidField) {
        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalidField.focus();
    }

    return isValid;
}

function initializePropertySelector(select) {
    if (!select) return;
    select.innerHTML = '<option value="">Select a property to add</option>';
    for (const [key, value] of Object.entries(propertyTypes)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = value.name;
        select.appendChild(option);
    }
}

//Add Rule Group
function addRuleGroup(afterElement = null, insertAtTop = false) {
    const div = document.createElement('div');
    div.className = 'rule-group';
    const groupId = 'group-' + Date.now();
    div.id = groupId;
    div.innerHTML = `
            <div class="rule-group-header">
                <h3>Rule Group</h3>
                <div class="input-row always-visible">
                    <div class="input-group">
                        <label for="startDate-${groupId}">Start Date</label>
                        <input type="date" id="startDate-${groupId}" required oninput="updateNavigation()">
                    </div>
                    <div class="input-group">
                        <label for="endDate-${groupId}">End Date (Optional)</label>
                        <input type="date" id="endDate-${groupId}" oninput="updateNavigation()">
                    </div>
                    <div class="input-group">
                       <label for="payerAccounts-${groupId}">PayerAccount ID (Optional)</label>
                       <input type="text" id="payerAccounts-${groupId}" placeholder="Enter PayerAccount ID (optional)">
                    </div>
                    <div class="input-group">
                        <label for="enabled-${groupId}">Enabled</label>
                        <select id="enabled-${groupId}">
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>
                    <button class="collapse-button" onclick="toggleRuleGroupCollapse(this)">▼</button>
                </div>
            </div>
            <div class="rule-group-content">
                <div class="rules"></div>
                <div class="button-group">
                    <button onclick="addRule(this)" class="button">
                        <span class="button-icon">➕</span>Add Billing Rule
                    </button>
                    <button onclick="addRuleGroup(this.closest('.rule-group'))" class="button">
                        <span class="button-icon">➕</span>Add Rule Group
                    </button>
                    <button class="button button-red" onclick="removeRuleGroup(this)">
                        <span class="button-icon">×</span>Remove Rule Group
                    </button>
                </div>
            </div>
        `;

    const container = document.getElementById('groupsContainer');

    if (insertAtTop) {
        container.insertBefore(div, container.firstChild);
    } else if (afterElement) {
        container.insertBefore(div, afterElement.nextSibling);
    } else {
        container.appendChild(div);
    }

    // Update navigation after adding the group
    setTimeout(updateNavigation, 0);
}

function removeRuleGroup(button) {
    const ruleGroup = button.closest('.rule-group');
    if (ruleGroup) {
        ruleGroup.remove();
        setTimeout(updateNavigation, 0);
    }
}

//Add Billing Rule
function addRule(button) {
    const rulesContainer = button.closest('.rule-group').querySelector('.rules');
    const div = document.createElement('div');
    div.className = 'rule';
    const ruleId = 'rule-' + Date.now();
    div.id = ruleId;
    div.innerHTML = `
                <div class="rule-header">
                    <h4>Billing Rule</h4>
                    <div class="input-group always-visible">
                        <label>Billing Rule Name</label>
                        <div class="input-with-button">
                            <input type="text" class="ruleName" placeholder="Enter Billing Rule name" />
                            <button class="collapse-button" onclick="toggleBillingRuleCollapse(this)">▼</button>
                        </div>
                    </div>
                </div>
                <div class="rule-content">
                    <div class="billing-rule-inline">
                <div class="input-group">
                    <label>Billing Adjustment</label>
                    <input type="number" class="billingAdjustment" placeholder="e.g. 0.00"/>
                </div>
                <div class="input-group">
                    <label>Billing Rule Type</label>
                    <select class="billingRuleType">
                        <option value="percentDiscount">percentDiscount</option>
                        <option value="percentIncrease">percentIncrease</option>
                        <option value="fixedRate">fixedRate</option>
                    </select>
                </div>
                <div class="input-group compact">
                    <label>Include Data Transfer</label>
                    <select class="includeDataTransfer">
                        <option value="true">true</option>
                        <option value="false">false</option>
                    </select>
                </div>
                <div class="input-group compact">
                    <label>Include RI Purchases</label>
                    <select class="includeRIPurchases">
                        <option value="true">true</option>
                        <option value="false" selected>false</option>
                    </select>
                </div>
            </div>
                <div class="product-inline">
                    <div class="input-group">
                        <label>Product Name</label>
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
                    </div>
                    <div class="input-group compact">
                        <label>Product Include Data Transfer</label>
                        <select class="productIncludeDataTransfer">
                            <option value="">(inherit)</option>
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </select>
                    </div>
                    <div class="input-group compact">
                        <label>Product Include RI Purchases</label>
                        <select class="productIncludeRIPurchases">
                            <option value="">(inherit)</option>
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </select>
                    </div>
                </div>
       <!-- Active Properties Section -->
        <div class="active-properties">
            <h2>Active Product Property Filters</h2>
            <div class="property-tags" id="activeTags">
                <!-- Tags will be populated by JavaScript -->
            </div>
        </div>

        <!-- Property Selector -->
        <div class="property-selector">
            <select class="propertySelect">
                <option value="">Select a property to add</option>
            </select>
            <button onclick="addSelectedProperty('${ruleId}')">Add Property</button>
        </div>

        <!-- Property Sections -->
        <div class="propertySections">
            <!-- Property sections will be dynamically added here -->
        </div>
                <button class="button button-red" onclick="removeRule(this)">
                    <span class="button-icon">×</span>Remove Billing Rule
                </button>
            `;
    rulesContainer.appendChild(div);
    initializePropertySelector(div.querySelector('.propertySelect'));

    // Update navigation after adding the rule
    setTimeout(updateNavigation, 0);

    // Add event listener for rule name changes
    const ruleNameInput = div.querySelector('.ruleName');
    ruleNameInput.addEventListener('input', updateNavigation);
}

// Initialize navigation on page load
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(updateNavigation, 0);
});
function removeRule(button) {
    const rule = button.closest('.rule');
    if (rule) {
        rule.remove();
        setTimeout(updateNavigation, 0);
    }
}

// Rules Navigation Bar function

function updateNavigation() {
    const ruleSearch = $('#ruleSearch');
    if (!ruleSearch.length) return;

    // Clear existing options
    ruleSearch.empty();

    // Add a default placeholder option
    ruleSearch.append(new Option('Select or search for a Billing rule...', '', true, true));

    document.querySelectorAll('.rule-group').forEach((ruleGroup, groupIndex) => {
        const startDate = ruleGroup.querySelector('input[type="date"][id^="startDate-"]').value || '(noStartDate)';
        const endDate = ruleGroup.querySelector('input[type="date"][id^="endDate-"]').value || '(noEndDate)';

        ruleGroup.querySelectorAll('.rule').forEach((rule, ruleIndex) => {
            const fullRuleName = rule.querySelector('.ruleName').value || `Rule ${groupIndex + 1}.${ruleIndex + 1}`;
            let ruleName = fullRuleName;

            // Truncate rule name if it's too long
            const maxLength = 80;
            if (ruleName.length > maxLength) {
                ruleName = ruleName.substring(0, maxLength) + '...';
            }

            const ruleIdentifier = `${groupIndex + 1}.${ruleIndex + 1}`;
            const optionText = `${ruleIdentifier} - ${ruleName} -> ${startDate} to ${endDate}`;

            // Add option to Select2
            const option = new Option(optionText, rule.id, false, false);

            // Add title attribute for hover tooltip showing full name
            option.title = `${fullRuleName} -> ${startDate} to ${endDate}`;

            ruleSearch.append(option);
        });
    });

    // Initialize or update Select2
    ruleSearch.select2({
        placeholder: 'Select or search for a Billing rule...',
        width: '100%',
        allowClear: false,
        theme: 'classic',
        dropdownParent: document.querySelector('.rule-nav'),
        containerCssClass: 'select2-container--full-width',
        dropdownCssClass: 'select2-dropdown--full-width',
        templateResult: formatRuleOption,
        templateSelection: formatRuleOption,
        minimumResultsForSearch: 6
    });

    // Handle selection
    ruleSearch.off('select2:select').on('select2:select', function (e) {
        const ruleId = e.params.data.id;
        const selectedRule = document.getElementById(ruleId);
        if (selectedRule) {
            expandAndScrollToRule(selectedRule);
        }
    });

    // Add placeholder to search field when dropdown is opened
    ruleSearch.off('select2:open').on('select2:open', function (e) {
        $('.select2-search__field').attr('placeholder', 'Type to search...');
    });

    // Handle dropdown closing
    ruleSearch.off('select2:close').on('select2:close', function (e) {
        if (!ruleSearch.val()) {
            ruleSearch.val(null).trigger('change');
        }
    });

    // Restore previous selection if it exists
    const previousSelection = ruleSearch.val();
    if (previousSelection) {
        ruleSearch.val(previousSelection).trigger('change');
    }
}

// Function to format the rule option with tooltip
function formatRuleOption(rule) {
    if (!rule.id) {
        return rule.text;
    }
    var $rule = $('<span title="' + rule.title + '">' + rule.text + '</span>');
    return $rule;
}

// Function to expand and scroll to the selected rule
function expandAndScrollToRule(rule) {
    // Expand parent rule group if collapsed
    const ruleGroup = rule.closest('.rule-group');
    const ruleGroupContent = ruleGroup.querySelector('.rule-group-content');
    const ruleGroupButton = ruleGroup.querySelector('.rule-group-header .collapse-button');

    if (ruleGroupContent.classList.contains('collapsed')) {
        ruleGroupContent.classList.remove('collapsed');
        ruleGroupButton.classList.remove('collapsed');
        ruleGroupButton.textContent = '▼';
    }

    // Expand the rule if collapsed
    const ruleContent = rule.querySelector('.rule-content');
    const ruleButton = rule.querySelector('.rule-header .collapse-button');

    if (ruleContent.classList.contains('collapsed')) {
        ruleContent.classList.remove('collapsed');
        ruleButton.classList.remove('collapsed');
        ruleButton.textContent = '▼';
    }

    // Scroll to the rule
    rule.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function expandAndScrollToRule(rule) {
    // First, expand the parent rule group if it's collapsed
    const ruleGroup = rule.closest('.rule-group');
    const ruleGroupContent = ruleGroup.querySelector('.rule-group-content');
    const ruleGroupButton = ruleGroup.querySelector('.rule-group-header .collapse-button');

    if (ruleGroupContent.classList.contains('collapsed')) {
        ruleGroupContent.classList.remove('collapsed');
        ruleGroupButton.classList.remove('collapsed');
        ruleGroupButton.textContent = '▼';
    }

    // Then, expand the billing rule if it's collapsed
    const ruleContent = rule.querySelector('.rule-content');
    const ruleButton = rule.querySelector('.rule-header .collapse-button');

    if (ruleContent.classList.contains('collapsed')) {
        ruleContent.classList.remove('collapsed');
        ruleButton.classList.remove('collapsed');
        ruleButton.textContent = '▼';
    }

    // Finally, scroll to the rule
    rule.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToBottom() {
    window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
    });
}

// Initialize navigation on page load
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(updateNavigation, 0);
});

// Property types configuration
const propertyTypes = {
    region: { name: 'Region', type: 'standard' },
    usageType: { name: 'Usage Type', type: 'standard' },
    operation: { name: 'Operation', type: 'standard' },
    recordType: { name: 'Record Type', type: 'standard' },
    instanceProperty: { name: 'Instance Property', type: 'instance' },
    lineItemDescription: { name: 'Line Item Description', type: 'lineItem' },
    savingsPlanOfferingType: { name: 'Savings Plan Offering Type', type: 'standard' }
};

// Track added properties
let addedProperties = new Set();

// Track expanded state
let expandedSections = new Set();

// Initialize UI
function initializeUI() {
    addRuleGroup(null, true); // Add an initial rule group
    initializePropertySelector();
}

function addSelectedProperty(ruleId) {
    const rule = document.getElementById(ruleId);
    const select = rule.querySelector('.propertySelect');
    const propertyType = select.value;
    if (propertyType) {
        // Collapse all expanded sections in this rule
        rule.querySelectorAll('.property-content.expanded').forEach(content => {
            content.classList.remove('expanded');
        });

        removeUnusedProperties(rule);
        if (!rule.addedProperties) {
            rule.addedProperties = new Set();
        }
        if (!rule.addedProperties.has(propertyType)) {
            addPropertySection(propertyType, rule);
            rule.addedProperties.add(propertyType);
            addValue(propertyType, rule);

            // Expand the newly added property section
            const newContent = rule.querySelector(`#${propertyType}Content`);
            if (newContent) {
                newContent.classList.add('expanded');
            }
        }
        updatePropertySelect(select);
    }
}

function removeUnusedProperties(rule) {
    if (!rule.addedProperties) return;
    rule.addedProperties.forEach(propertyType => {
        const status = rule.querySelector(`#${propertyType}Status`);
        if (status && status.textContent === 'Not in use') {
            const section = rule.querySelector(`#${propertyType}Section`);
            if (section) {
                section.remove();
                rule.addedProperties.delete(propertyType);
            }
        }
    });
    updatePropertySelect(rule.querySelector('.propertySelect'));
}

function addPropertySection(propertyType, rule) {
    const container = rule.querySelector('.propertySections');
    const section = document.createElement('div');
    section.className = 'property-section';
    section.id = `${propertyType}Section`;

    const header = document.createElement('div');
    header.className = 'property-header';
    header.style.cursor = 'pointer';
    header.onclick = () => toggleSection(propertyType, rule);
    header.innerHTML = `
                    <div class="header-content">
                        <h5>${propertyTypes[propertyType].name}</h5>
                        <span class="status" id="${propertyType}Status">Not in use</span>
                    </div>
                `;

    const content = document.createElement('div');
    content.className = 'property-content';
    content.id = `${propertyType}Content`;

    const valuesContainer = document.createElement('div');
    valuesContainer.id = `${propertyType}Values`;

    const addButton = document.createElement('button');
    addButton.className = 'add-value';
    addButton.textContent = `Add ${propertyTypes[propertyType].name}`;
    addButton.onclick = (e) => {
        e.stopPropagation();
        addValue(propertyType, rule);
    };

    content.appendChild(valuesContainer);
    content.appendChild(addButton);

    section.appendChild(header);
    section.appendChild(content);
    container.appendChild(section);

    toggleSection(propertyType, rule);
}

// Update toggleSection function to work with both scenarios
function toggleSection(propertyType, rule) {
    // If rule is provided, use it to find the content, otherwise use document.getElementById
    const content = rule ?
        rule.querySelector(`#${propertyType}Content`) :
        document.getElementById(`${propertyType}Content`);

    if (!content) return;

    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        if (rule && !rule.expandedSections) {
            rule.expandedSections = new Set();
        }
        if (rule) {
            rule.expandedSections.delete(propertyType);
        }
    } else {
        content.classList.add('expanded');
        if (rule && !rule.expandedSections) {
            rule.expandedSections = new Set();
        }
        if (rule) {
            rule.expandedSections.add(propertyType);
        }
    }
}

function addValue(propertyType, rule) {
    const container = rule.querySelector(`#${propertyType}Values`);
    const div = document.createElement('div');

    switch (propertyTypes[propertyType].type) {
        case 'standard':
            div.className = 'property-value';
            div.innerHTML = `
                <input type="text" placeholder="Enter ${propertyTypes[propertyType].name}" 
                       onchange="updatePropertyStatus('${propertyType}', this)">
                <button onclick="removeValue(this, '${propertyType}')">×</button>
            `;
            break;
        case 'instance':
            div.className = 'instance-property-value';
            div.innerHTML = `
                <input type="text" placeholder="Instance Type" onchange="updatePropertyStatus('${propertyType}', this)">
                <input type="text" placeholder="Instance Size" onchange="updatePropertyStatus('${propertyType}', this)">
                <select onchange="updatePropertyStatus('${propertyType}', this)">
                    <option value="false">Not Reserved</option>
                    <option value="true">Reserved</option>
                </select>
                <button onclick="removeValue(this, '${propertyType}')">×</button>
            `;
            break;
        case 'lineItem':
            div.className = 'line-item-description-value';
            div.innerHTML = `
                <select onchange="updatePropertyStatus('${propertyType}', this)">
                    <option value="contains">Contains</option>
                    <option value="startsWith">Starts With</option>
                    <option value="matchesRegex">Matches Regex</option>
                </select>
                <input type="text" placeholder="Enter description" onchange="updatePropertyStatus('${propertyType}', this)">
                <button onclick="removeValue(this, '${propertyType}')">×</button>
            `;
            break;
    }

    container.appendChild(div);
    updatePropertyStatus(propertyType, rule);
}

function removeValue(button, propertyType) {
    const element = button.closest('.property-value, .instance-property-value, .line-item-description-value');
    const rule = button.closest('.rule');
    if (element) {
        element.remove();
        updatePropertyStatus(propertyType, rule.querySelector(`#${propertyType}Values`));
    }
}

function updatePropertyStatus(propertyType, element) {
    const rule = element.closest('.rule');
    const container = rule.querySelector(`#${propertyType}Values`);
    let hasValues = false;
    let valueCount = 0;

    if (propertyTypes[propertyType].type === 'instance') {
        const instanceSets = container.querySelectorAll('.instance-property-value');
        instanceSets.forEach(set => {
            const inputs = set.querySelectorAll('input');
            if (Array.from(inputs).some(input => input.value.trim() !== '')) {
                hasValues = true;
                valueCount++;
            }
        });
    } else {
        const inputs = container.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.value.trim() !== '') {
                hasValues = true;
                valueCount++;
            }
        });
    }

    const status = rule.querySelector(`#${propertyType}Status`);
    status.textContent = hasValues ? 'In use' : 'Not in use';
    status.className = `status ${hasValues ? 'active' : ''}`;

    updateActiveTags(rule);
}


function updateActiveTags(rule) {
    const container = rule.querySelector('.property-tags');
    container.innerHTML = '';

    if (!rule.addedProperties) return;

    rule.addedProperties.forEach(propertyType => {
        const valueContainer = rule.querySelector(`#${propertyType}Values`);
        let activeCount = 0;

        if (propertyTypes[propertyType].type === 'instance') {
            const instanceSets = valueContainer.querySelectorAll('.instance-property-value');
            instanceSets.forEach(set => {
                const inputs = set.querySelectorAll('input');
                if (Array.from(inputs).some(input => input.value.trim() !== '')) {
                    activeCount++;
                }
            });
        } else {
            const inputs = valueContainer.querySelectorAll('input');
            activeCount = Array.from(inputs).filter(input => input.value.trim() !== '').length;
        }

        if (activeCount > 0) {
            const tag = document.createElement('div');
            tag.className = 'property-tag';
            tag.onclick = () => {
                const content = rule.querySelector(`#${propertyType}Content`);
                if (content) {
                    content.classList.toggle('expanded');
                }
            };
            tag.innerHTML = `
                ${propertyTypes[propertyType].name}
                <span class="count">${activeCount}</span>
            `;
            container.appendChild(tag);
        }
    });
}

function updatePropertySelect(select) {
    if (!select) return;
    const rule = select.closest('.rule');
    Array.from(select.options).forEach(option => {
        option.disabled = rule.addedProperties && rule.addedProperties.has(option.value);
    });
    select.value = '';
}
document.addEventListener('DOMContentLoaded', initializeUI);

function addSavingsPlanOfferingType(button) {
    const container = button.closest('.sub-group').querySelector('.savingsPlanOfferingTypes');
    const div = document.createElement('div');
    div.className = 'sub-entry';
    div.innerHTML = `
        <button type="button" class="small-button" onclick="this.parentElement.remove()">×</button>
        <input type="text" class="savingsPlanOfferingTypeName" placeholder="Enter Savings Plan Offering Type..." />
    `;
    container.appendChild(div);
}


// Updated generateOutput to return a Promise that resolves after the async timeout


// XML Generator
function generateXML() {
    if (!validateForm()) {
        alert("Please fill in all required fields.");
        return;
    }

    const createdByInput = document.getElementById('createdBy');
    const createdBy = createdByInput.value;
    const comment = document.getElementById('comment').value || '';
    const groups = document.querySelectorAll('.rule-group');
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<CHTBillingRules createdBy="${createdBy}" date="${new Date().toISOString().split('T')[0]}">\n\t<Comment>${comment}</Comment>\n`;

    groups.forEach(group => {
        let startDate = group.querySelector('[id^="startDate-"]').value;
        if (!startDate) {
            const now = new Date();
            startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        }
        const endDate = group.querySelector('[id^="endDate-"]').value;
        const enabled = group.querySelector('[id^="enabled-"]').value;
        const payerAccounts = group.querySelector('[id^="payerAccounts-"]').value.trim();  // Fetch and trim for safety

        xml += `\t<RuleGroup startDate="${startDate}"${endDate ? ` endDate="${endDate}"` : ''}${payerAccounts ? ` payerAccounts="${payerAccounts}"` : ''}${enabled === "false" ? ` enabled="false"` : ''}>\n`;

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

            xml += `\t\t<BillingRule name="${name}" includeDataTransfer="${dataTransfer}"${rip === "true" ? ` includeRIPurchases="true"` : ''}>\n`;
            xml += `\t\t\t<BasicBillingRule billingAdjustment="${adj}" billingRuleType="${type}"/>\n`;
            xml += `\t\t\t<Product productName="${product}"${prodDT ? ` includeDataTransfer="${prodDT}"` : ''}${prodRIP ? ` includeRIPurchases="${prodRIP}"` : ''}>`;

            let subTags = '';

            // Proper order of properties
            const propertyOrder = [
                'region',
                'usageType',
                'operation',
                'recordType',
                'instanceProperty',
                'lineItemDescription',
                'savingsPlanOfferingType'
            ];

            // Safely collect addedProperties
            const addedSet = new Set();
            if (rule.addedProperties && typeof rule.addedProperties.forEach === 'function') {
                rule.addedProperties.forEach(p => addedSet.add(p));
            }

            propertyOrder.forEach(propertyType => {
                if (!addedSet.has(propertyType)) return;

                const valuesContainer = rule.querySelector(`#${propertyType}Values`);
                if (!valuesContainer) return;

                switch (propertyType) {
                    case 'region':
                        valuesContainer.querySelectorAll('.property-value input').forEach(input => {
                            const val = input.value.trim();
                            if (val) subTags += `\n\t\t\t\t<Region name="${val}"/>`;
                        });
                        break;

                    case 'usageType':
                        valuesContainer.querySelectorAll('.property-value input').forEach(input => {
                            const val = input.value.trim();
                            if (val) subTags += `\n\t\t\t\t<UsageType name="${val}"/>`;
                        });
                        break;

                    case 'operation':
                        valuesContainer.querySelectorAll('.property-value input').forEach(input => {
                            const val = input.value.trim();
                            if (val) subTags += `\n\t\t\t\t<Operation name="${val}"/>`;
                        });
                        break;

                    case 'recordType':
                        valuesContainer.querySelectorAll('.property-value input').forEach(input => {
                            const val = input.value.trim();
                            if (val) subTags += `\n\t\t\t\t<RecordType name="${val}"/>`;
                        });
                        break;

                    case 'instanceProperty':
                        valuesContainer.querySelectorAll('.instance-property-value').forEach(entry => {
                            const inputs = entry.querySelectorAll('input');
                            const select = entry.querySelector('select');
                            const type = inputs[0].value.trim();
                            const size = inputs[1].value.trim();
                            const reserved = select.value === 'true';

                            if (type || size || reserved) {
                                subTags += `\n\t\t\t\t<InstanceProperties`;
                                if (type) subTags += ` instanceType="${type}"`;
                                if (size) subTags += ` instanceSize="${size}"`;
                                subTags += ` reserved="${reserved}"`;
                                subTags += ` />`;
                            }
                        });
                        break;

                    case 'lineItemDescription':
                        valuesContainer.querySelectorAll('.line-item-description-value').forEach(entry => {
                            const select = entry.querySelector('select');
                            const input = entry.querySelector('input');
                            const key = select.value;
                            const val = input.value.trim();
                            if (val) subTags += `\n\t\t\t\t<LineItemDescription ${key}="${val}" />`;
                        });
                        break;

                    case 'savingsPlanOfferingType':
                        valuesContainer.querySelectorAll('.property-value input').forEach(input => {
                            const val = input.value.trim();
                            if (val) subTags += `\n\t\t\t\t<SavingsPlanOfferingType name="${val}"/>`;
                        });
                        break;
                }
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
    return xml;
}

//JSON Generator
function generateJSON() {
    if (!validateForm()) {
        alert("Please fill in all required fields.");
        return;
    }
    const bookNameInput = document.getElementById('bookName');
    const bookName = bookNameInput.value.trim();

    const xml = generateXML();
    if (!xml) {
        alert("Failed to generate XML.");
        return;
    }

    // Populate the XML text area
    const xmlOutput = document.getElementById('xmlOutput');
    if (xmlOutput) {
        xmlOutput.value = xml;
    }

    const escapedXML = xml.replace(/"/g, '\\"');
    return `{"book_name":"${bookName}","specification":"${escapedXML}"}`;
}

function generateCURL() {
    const jsonPayload = generateJSON();
    if (!jsonPayload) return;

    // Populate the JSON text area
    const jsonOutput = document.getElementById('jsonOutput');
    if (jsonOutput) {
        jsonOutput.value = jsonPayload;
    }

    // Generate the cURL command
    const curlCommand = `curl -X POST https://chapi.cloudhealthtech.com/v1/price_books \\\n` +
        `  -H "Authorization: Bearer <YOUR_API_TOKEN>" \\\n` +
        `  -H "Content-Type: application/json" \\\n` +
        `  -d '${jsonPayload}'`;

    return curlCommand;
}

function updateAssignCustomerJSON(priceBookId) {
    const cxAPIIdInput = document.getElementById('cxAPIId').value.trim();
    const clientAPIId = cxAPIIdInput !== '' ? cxAPIIdInput : '<Enter ClientAPI ID>';

    const payload = {
        price_book_id: priceBookId,
        target_client_api_id: clientAPIId
    };

    document.getElementById('assignCustomerJSON').value = JSON.stringify(payload, null, 2);
}

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

    document.getElementById('assignCustomerJSON').value = curlCommand;
}

function updateAssignCustomerAccountJSON(priceBookAssignmentId) {
    const cxAPIIdInput = document.getElementById('cxAPIId').value.trim();
    const cxPayerIdInput = document.getElementById('cxPayerId').value.trim();
    const clientAPIId = cxAPIIdInput !== '' ? cxAPIIdInput : '<Enter ClientAPI ID>';

    let billingAccountOwnerIdArray = cxPayerIdInput === ''
        ? ["ALL"]
        : cxPayerIdInput.split(',').map(id => id.trim()).filter(id => id !== '');

    const jsonContent = {
        price_book_assignment_id: priceBookAssignmentId,
        billing_account_owner_id: billingAccountOwnerIdArray,
        target_client_api_id: clientAPIId
    };

    document.getElementById('assignCustomerAccountJSON').value = JSON.stringify(jsonContent, null, 2);
}

function updateAssignCustomerAccountCurl(priceBookAssignmentId) {
    const cxAPIIdInput = document.getElementById('cxAPIId').value.trim();
    const cxPayerIdInput = document.getElementById('cxPayerId').value.trim();
    const clientAPIId = cxAPIIdInput !== '' ? cxAPIIdInput : '<Enter ClientAPI ID>';

    let billingAccountOwnerIdArray = cxPayerIdInput === ''
        ? ["ALL"]
        : cxPayerIdInput.split(',').map(id => id.trim()).filter(id => id !== '');

    const billingAccountOwnerIdJSON = JSON.stringify(billingAccountOwnerIdArray);

    const curlCommand = `curl -X POST https://chapi.cloudhealthtech.com/v1/price_book_account_assignments \\
  -H "Authorization: Bearer <YOUR_API_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "price_book_assignment_id": "${priceBookAssignmentId}",
    "billing_account_owner_id": ${billingAccountOwnerIdJSON},
    "target_client_api_id": "${clientAPIId}"
  }'`;

    document.getElementById('assignCustomerAccountJSON').value = curlCommand;
}

function copyOutput(elementId) {
    const outputElement = document.getElementById(elementId);
    outputElement.select();
    document.execCommand('copy');
}

function downloadOutput(elementId, fileType) {
    const content = document.getElementById(elementId).value;
    const nameInput = document.getElementById('bookName');
    let base = nameInput ? nameInput.value.trim() : 'price_book';
    if (!base) base = 'price_book';

    // Sanitize filename
    base = base.replace(/[^\w\-]/g, '_');

    // Add date timestamp
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${base}_${timestamp}.${fileType}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function showLoadingIndicator() {
    document.querySelector('.loading-indicator').classList.add('active');
}

function hideLoadingIndicator() {
    document.querySelector('.loading-indicator').classList.remove('active');
}

document.getElementById('helpButton').addEventListener('click', () => {
    const modal = document.getElementById('helpModal');
    const content = document.getElementById('helpContent');
    content.innerHTML = `
                <p><strong>Rule Order:</strong> Custom price book XML specifications process rules in top-down order. The first applicable rule that satisfies all specified constraints for a line item is used, and then no subsequent rules are used for that line item. If no applicable and matching rule is found, the line item will have a 0% calculated price adjustment.</p>
                <p><strong>Rule Applicability:</strong> Rule applicability is determined by the startDate and endDate attributes in enabled RuleGroup elements. startDates and endDates are inclusive. Whether or not an applicable rule is actually used depends on its order relative to other rules and the constraints it specifies for matching line items.</p>
                <p><strong>For more details:</strong> <a href="https://apidocs.cloudhealthtech.com/#price-book_introduction-to-price-book-api" target="_blank" style="color: #4ca1af;">API Documentation</a></p>
            `;
    modal.style.display = 'block';
});

function closeModal() {
    document.getElementById('helpModal').style.display = 'none';
}

// Import Price Book function
document.getElementById('importButton').addEventListener('click', function () {
    const mainFields = ['bookName', 'createdBy', 'comment', 'cxAPIId', 'cxPayerId'];
    const allFieldsEmpty = mainFields.every(fieldId => document.getElementById(fieldId).value.trim() === '');
    const noRuleGroups = document.getElementById('groupsContainer').children.length === 0;

    if (allFieldsEmpty && noRuleGroups) {
        // If all fields are empty and there are no rule groups, import without prompting
        document.getElementById('fileInput').click();
    } else {
        // If there's data, prompt for confirmation
        if (confirm('Importing a price book will clear the existing data in the form. Do you want to continue?')) {
            document.getElementById('fileInput').click();
        }
    }
});

document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result || '';
            // Reset all fields and clear all rule groups before import
            performReset();  // Assuming performReset() is defined elsewhere; if not, use resetAllFields()

            detectAndImport(text);
        };
        reader.readAsText(file);
    }
});

// Content sniffing + dispatch
function detectAndImport(text) {
    let trimmed = (text || '').trim();

    // Trim UTF-8 BOM if present
    if (trimmed.charCodeAt(0) === 0xFEFF) {
        trimmed = trimmed.slice(1);
    }

    if (!trimmed) {
        alert('The file is empty.');
        return;
    }

    // Quick sniff by first non-whitespace char
    const firstChar = trimmed[0];

    if (firstChar === '{' || firstChar === '[') {
        // Likely JSON
        const ok = tryImportAsJSON(trimmed);
        if (!ok) {
            // If strict JSON parse failed, try XML as a fallback
            const okXML = tryImportAsXML(trimmed);
            if (!okXML) alert('Unable to parse file as JSON or XML.');
        }
        return;
    }

    if (firstChar === '<') {
        // Likely XML
        const okXML = tryImportAsXML(trimmed);
        if (!okXML) {
            // Maybe it’s JSON with leading BOM/spaces? Try JSON as fallback
            const okJSON = tryImportAsJSON(trimmed);
            if (!okJSON) alert('Unable to parse file as XML or JSON.');
        }
        return;
    }

    // Heuristics when first char is ambiguous
    if (looksLikeJSON(trimmed)) {
        const ok = tryImportAsJSON(trimmed);
        if (ok) return;
    }
    if (looksLikeXML(trimmed)) {
        const ok = tryImportAsXML(trimmed);
        if (ok) return;
    }

    // As a last attempt, try both with error-guard
    if (!tryImportAsJSON(trimmed) && !tryImportAsXML(trimmed)) {
        alert('Unsupported or invalid file content. Please upload a valid JSON or XML.');
    }
}

function looksLikeJSON(s) {
    // Quick heuristic: presence of quotes-colon pairs and curly braces
    return /["']\s*:\s*/.test(s) && /[{[]/.test(s);
}

function looksLikeXML(s) {
    // Quick heuristic: starts with < and has matching tag patterns
    return /^<\?xml|^<\w+[\s>]/.test(s);
}

// Strict JSON import with your existing logic + fallback extraction
function tryImportAsJSON(text) {
    try {
        const obj = JSON.parse(text);
        // Your JSON format expects an embedded XML under "specification"
        const xmlString = obj && obj.specification;
        if (typeof xmlString === 'string' && xmlString.trim().startsWith('<')) {
            handleJSONImportWithXML(obj, xmlString);
            return true;
        }
        // If your JSON ever evolves to carry all fields directly, add that handler here
        alert('JSON parsed but no "specification" XML found.');
        return false;
    } catch (e) {
        // Attempt your manual extraction approach
        const extracted = extractXMLFromMalformedJSON(text);
        if (extracted) {
            handleJSONImportWithXML({ book_name: extracted.bookName || 'Unknown' }, extracted.xml);
            return true;
        }
        return false;
    }
}

function handleJSONImportWithXML(jsonContent, xmlString) {
    // Keep existing behavior: populate from XML, use JSON fields where applicable
    populateFieldsFromXMLString(xmlString, jsonContent);
}

// Your existing manual extraction, made into a helper
function extractXMLFromMalformedJSON(raw) {
    try {
        const bookNameMatch = raw.match(/"book_name"\s*:\s*"([^"]*)"/);
        const specKeyMatch = raw.match(/"specification"\s*:\s*"/);
        if (!specKeyMatch) return null;

        const startIndex = specKeyMatch.index + specKeyMatch[0].length;
        // Parse a JSON string value, honoring escapes
        let i = startIndex;
        let xml = '';
        let escaped = false;
        while (i < raw.length) {
            const ch = raw[i];
            if (!escaped && ch === '"') break; // end of string
            if (!escaped && ch === '\\') {
                escaped = true;
            } else {
                xml += ch;
                escaped = false;
            }
            i++;
        }
        // Unescape common sequences
        xml = xml
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');

        return { xml, bookName: bookNameMatch ? bookNameMatch[1] : undefined };
    } catch {
        return null;
    }
}

// XML import with robust parsererror detection
function tryImportAsXML(text) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'application/xml');
    const parseError = xmlDoc.getElementsByTagName('parsererror')[0];

    if (parseError) {
        return false;
    }

    handleXMLImport(text);
    return true;
}

function resetAllFields() {
    // Clear main fields
    document.getElementById('bookName').value = '';
    document.getElementById('createdBy').value = '';
    document.getElementById('comment').value = '';
    document.getElementById('cxAPIId').value = '';
    document.getElementById('cxPayerId').value = '';

    // Clear all rule groups
    document.getElementById('groupsContainer').innerHTML = '';

    // Clear all output areas
    document.getElementById('xmlOutput').value = '';
    document.getElementById('jsonOutput').value = '';
    document.getElementById('assignCustomerJSON').value = '';
    document.getElementById('assignCustomerAccountJSON').value = '';

    // Remove any error styling
    document.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
}

function handleXMLImport(result) {
    populateFieldsFromXMLString(result);
}

function handleJSONImport(result) {
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
}

function populateFieldsFromXMLString(xmlString, jsonContent = null) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

    const bookNameValue = jsonContent ? jsonContent.book_name : '';
    document.getElementById('bookName').value = bookNameValue;

    const createdByValue = xmlDoc.documentElement.getAttribute('createdBy');
    document.getElementById('createdBy').value = createdByValue || '';

    const comment = xmlDoc.querySelector('Comment')?.textContent || '';
    document.getElementById('comment').value = comment;

    document.getElementById('groupsContainer').innerHTML = '';

    const ruleGroups = xmlDoc.getElementsByTagName('RuleGroup');
    Array.from(ruleGroups).forEach(ruleGroup => {
        addRuleGroup();
        const currentGroup = document.querySelector('.rule-group:last-child');

        currentGroup.querySelector('[id^="startDate-"]').value = ruleGroup.getAttribute('startDate');
        currentGroup.querySelector('[id^="endDate-"]').value = ruleGroup.getAttribute('endDate');
        currentGroup.querySelector('[id^="payerAccounts-"]').value = ruleGroup.getAttribute('payerAccounts') || '';
        currentGroup.querySelector('[id^="enabled-"]').value = ruleGroup.getAttribute('enabled') || 'true';

        const billingRules = ruleGroup.getElementsByTagName('BillingRule');
        Array.from(billingRules).forEach(billingRule => {
            const addRuleButton = currentGroup.querySelector('button');
            addRule(addRuleButton);

            const currentRule = currentGroup.querySelector('.rule:last-child');
            currentRule.addedProperties = new Set();

            currentRule.querySelector('.ruleName').value = billingRule.getAttribute('name');
            const basicBillingRule = billingRule.getElementsByTagName('BasicBillingRule')[0];
            currentRule.querySelector('.billingAdjustment').value = basicBillingRule.getAttribute('billingAdjustment');
            currentRule.querySelector('.billingRuleType').value = basicBillingRule.getAttribute('billingRuleType');
            currentRule.querySelector('.includeDataTransfer').value = billingRule.getAttribute('includeDataTransfer');
            currentRule.querySelector('.includeRIPurchases').value = billingRule.getAttribute('includeRIPurchases') || 'false';

            const product = billingRule.getElementsByTagName('Product')[0];
            if (product) {
                currentRule.querySelector('.productName').value = product.getAttribute('productName');
                currentRule.querySelector('.productIncludeDataTransfer').value = product.getAttribute('includeDataTransfer') || '';
                currentRule.querySelector('.productIncludeRIPurchases').value = product.getAttribute('includeRIPurchases') || '';

                initializePropertySelector(currentRule.querySelector('.propertySelect'));
                importProperties(product, currentRule);
            }
        });
    });

    // After all DOM updates, collapse all properties
    setTimeout(collapseAllProperties, 0);
}

function importProperties(product, currentRule) {
    // Import all properties
    importProperty(product, currentRule, 'Region', 'region');
    importProperty(product, currentRule, 'UsageType', 'usageType');
    importProperty(product, currentRule, 'Operation', 'operation');
    importProperty(product, currentRule, 'RecordType', 'recordType');

    // Import Instance Properties
    const instanceProps = product.getElementsByTagName('InstanceProperties');
    if (instanceProps.length > 0) {
        addSelectedPropertyToRule(currentRule, 'instanceProperty');
        Array.from(instanceProps).forEach(instanceProp => {
            addValue('instanceProperty', currentRule);
            const lastSet = currentRule.querySelector('#instancePropertyValues .instance-property-value:last-child');
            if (lastSet) {
                const inputs = lastSet.querySelectorAll('input');
                inputs[0].value = instanceProp.getAttribute('instanceType') || '';
                inputs[1].value = instanceProp.getAttribute('instanceSize') || '';
                lastSet.querySelector('select').value = instanceProp.getAttribute('reserved') === 'true' ? 'true' : 'false';
            }
        });
    }

    // Import Line Item Descriptions
    const lineItems = product.getElementsByTagName('LineItemDescription');
    if (lineItems.length > 0) {
        addSelectedPropertyToRule(currentRule, 'lineItemDescription');
        Array.from(lineItems).forEach(lineItem => {
            addValue('lineItemDescription', currentRule);
            const lastSet = currentRule.querySelector('#lineItemDescriptionValues .line-item-description-value:last-child');
            if (lastSet) {
                const select = lastSet.querySelector('select');
                const input = lastSet.querySelector('input');
                ['contains', 'startsWith', 'matchesRegex'].forEach(type => {
                    if (lineItem.hasAttribute(type)) {
                        select.value = type;
                        input.value = lineItem.getAttribute(type);
                    }
                });
            }
        });
    }

    importProperty(product, currentRule, 'SavingsPlanOfferingType', 'savingsPlanOfferingType');

    // Update property statuses
    Object.keys(propertyTypes).forEach(propertyType => {
        if (currentRule.addedProperties.has(propertyType)) {
            updatePropertyStatus(propertyType, currentRule);
        }
    });
}

function importProperty(product, currentRule, xmlTag, propertyType) {
    const elements = product.getElementsByTagName(xmlTag);
    if (elements.length > 0) {
        addSelectedPropertyToRule(currentRule, propertyType);
        Array.from(elements).forEach(element => {
            addValue(propertyType, currentRule);
            const lastInput = currentRule.querySelector(`#${propertyType}Values .property-value:last-child input`);
            if (lastInput) lastInput.value = element.getAttribute('name');
        });
    }
}

function collapseAllProperties() {
    const rules = document.querySelectorAll('.rule');
    rules.forEach(rule => {
        collapseAllPropertiesInRule(rule);
    });
}

function collapseAllPropertiesInRule(rule) {
    const propertyContents = rule.querySelectorAll('.property-content');
    propertyContents.forEach(content => {
        content.classList.remove('expanded');
    });

    if (!rule.expandedSections) {
        rule.expandedSections = new Set();
    }
    rule.expandedSections.clear();

    // Update the active tags to reflect the collapsed state
    updateActiveTags(rule);
}

function addSelectedPropertyToRule(rule, propertyType) {
    if (!rule.addedProperties) {
        rule.addedProperties = new Set();
    }
    if (!rule.addedProperties.has(propertyType)) {
        addPropertySection(propertyType, rule);
        rule.addedProperties.add(propertyType);

        // Ensure the newly added section starts collapsed
        const content = rule.querySelector(`#${propertyType}Content`);
        if (content) {
            content.classList.remove('expanded');
        }
    }
}

if (!rule.addedProperties) {
    rule.addedProperties = new Set();
}
if (!rule.addedProperties.has(propertyType)) {
    addPropertySection(propertyType, rule);
    rule.addedProperties.add(propertyType);

    // Ensure the newly added section starts collapsed
    const content = rule.querySelector(`#${propertyType}Content`);
    if (content) {
        content.classList.remove('expanded');
    }
}


function toggleCollapse(button, contentSelector) {
    const content = button.closest('.rule-group, .rule').querySelector(contentSelector);
    button.classList.toggle('collapsed');
    content.classList.toggle('collapsed');

    if (button.classList.contains('collapsed')) {
        button.textContent = '▶';
    } else {
        button.textContent = '▼';
    }
}
function toggleRuleGroupCollapse(button) {
    const ruleGroup = button.closest('.rule-group');
    const content = ruleGroup.querySelector('.rule-group-content');
    button.classList.toggle('collapsed');
    content.classList.toggle('collapsed');

    if (button.classList.contains('collapsed')) {
        button.textContent = '▶';
    } else {
        button.textContent = '▼';
    }
}

function toggleBillingRuleCollapse(button) {
    const rule = button.closest('.rule');
    const content = rule.querySelector('.rule-content');
    button.classList.toggle('collapsed');
    content.classList.toggle('collapsed');

    if (button.classList.contains('collapsed')) {
        button.textContent = '▶';
    } else {
        button.textContent = '▼';
    }
}
//Rest all fields.
function resetAllFields() {
    // Check if all main fields are empty
    const mainFields = ['bookName', 'createdBy', 'comment', 'cxAPIId', 'cxPayerId'];
    const allFieldsEmpty = mainFields.every(fieldId => document.getElementById(fieldId).value.trim() === '');
    const noRuleGroups = document.getElementById('groupsContainer').children.length === 0;

    if (allFieldsEmpty && noRuleGroups) {
        // If all fields are empty and there are no rule groups, reset without prompting
        performReset();
    } else {
        // If there's data, prompt for confirmation
        if (confirm('Are you sure you want to reset all fields? This action cannot be undone.')) {
            performReset();
        }
    }
}

function performReset() {
    // Clear main fields
    ['bookName', 'createdBy', 'comment', 'cxAPIId', 'cxPayerId'].forEach(fieldId => {
        document.getElementById(fieldId).value = '';
    });

    // Clear all rule groups
    document.getElementById('groupsContainer').innerHTML = '';

    // Clear all output areas
    ['xmlOutput', 'jsonOutput', 'assignCustomerJSON', 'assignCustomerAccountJSON'].forEach(fieldId => {
        document.getElementById(fieldId).value = '';
    });

    // Remove any error styling
    document.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

    // Reset property selector and clear properties
    addedProperties.clear();
    const propertySections = document.getElementById('propertySections');
    if (propertySections) {
        propertySections.innerHTML = '';
    }
    const activeTags = document.getElementById('activeTags');
    if (activeTags) {
        activeTags.innerHTML = '';
    }
    updatePropertySelect();

    // Add initial rule group
    addRuleGroup(null, true);
}

// BELOW CODE FOR READOUT PRICEBOOK FUNCTION

// Fetch current XML, either from textarea or generate fresh
function getCurrentSpecificationXML() {
    const xmlEl = document.getElementById('xmlOutput');
    if (xmlEl && xmlEl.value && xmlEl.value.trim().startsWith('<')) {
        return xmlEl.value.trim();
    }
    // Optionally regenerate XML here if needed
    // return generateXML();
    return null;
}

// Convert billing adjustment info to human readable
function toReadableAdjustment(type, adjustment) {
    if (!type) return 'No adjustment specified';
    const adj = adjustment != null ? adjustment : 'unspecified';
    const t = type.toLowerCase();
    if (t.includes('discount')) return `a ${adj} % discount`;
    if (t.includes('increase') || t.includes('markup')) return `a ${adj} % markup`;
    if (t.includes('fixed') || t.includes('rate')) return `a fixed rate of ${adj}`;
    return `${type} set to ${adj}`;
}

// Collect property filters inside a Product node
function collectProductFilters(productEl) {
    const filters = [];

    // Collect standard filters via helper
    addNameList(productEl, 'Region', 'Region', filters);
    addNameList(productEl, 'UsageType', 'Usage Type', filters);
    addNameList(productEl, 'Operation', 'Operation', filters);
    addNameList(productEl, 'RecordType', 'Record Type', filters);

    // InstanceProperties may be multiple sets
    const instProps = Array.from(productEl.getElementsByTagName('InstanceProperties'));
    instProps.forEach(ip => {
        const t = (ip.getAttribute('instanceType') || 'any').trim();
        const s = (ip.getAttribute('instanceSize') || 'any').trim();
        const r = ip.getAttribute('reserved');
        const parts = [`instanceType=${t}`, `instanceSize=${s}`];
        if (r !== null && r !== undefined) parts.push(`reserved=${r}`);
        filters.push(`Instance with ${parts.join(', ')}`);
    });

    // LineItemDescription with operator attributes
    const descNodes = Array.from(productEl.getElementsByTagName('LineItemDescription'));
    descNodes.forEach(ld => {
        let added = false;
        ['contains', 'startsWith', 'matchesRegex'].forEach(op => {
            if (ld.hasAttribute(op)) {
                filters.push(`LineItemDescription ${op} "${ld.getAttribute(op)}"`);
                added = true;
            }
        });
        if (!added) filters.push('LineItemDescription (no operator)');
    });

    // SavingsPlanOfferingType
    addNameList(productEl, 'SavingsPlanOfferingType', 'Savings Plan Offering Type', filters);

    return filters;
}

// Helper to extract names of given tag and join them for description
function joinWithCommasAndAnd(arr) {
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return arr[0] + ' and ' + arr[1];
  return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
}

function addNameList(parent, tag, label, outputArr) {
  const nodes = Array.from(parent.getElementsByTagName(tag));
  const names = nodes.map(n => n.getAttribute('name')).filter(Boolean).map(s => s.trim());
  if (names.length > 0) {
    outputArr.push(`${label}: ${joinWithCommasAndAnd(names)}`);
  }
}

// Escape HTML for safe display
function escapeHTML(str) {
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
}

// Format lines into HTML blocks with group styling
function wrapLinesAsHTML(lines) {
    const htmlBlocks = [];
    let group = [];

    lines.forEach(line => {
        if (!line.trim()) {
            if (group.length > 0) {
                htmlBlocks.push(`<div class="rulegroup">${group.join('<br>')}</div>`);
                group = [];
            }
        } else if (line.startsWith('  ')) {
            if (line.startsWith('    ')) {
                group.push(`<div class="filters">${escapeHTML(line)}</div>`);
            } else {
                group.push(`<div class="rule">${escapeHTML(line)}</div>`);
            }
        } else {
            group.push(escapeHTML(line));
        }
    });

    if (group.length > 0) {
        htmlBlocks.push(`<div class="rulegroup">${group.join('<br>')}</div>`);
    }
    return htmlBlocks.join('\n');
}

// Main Natural Language summary
function renderNaturalLanguageSummary() {
    const outputEl = document.getElementById('nlSummary');
    if (!outputEl) return;

    const xml = getCurrentSpecificationXML();
    if (!xml) {
        outputEl.textContent = 'No price book loaded.';
        return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
        outputEl.textContent = 'Error parsing XML.';
        return;
    }

    const lines = [];
    const root = doc.documentElement;
    const bookName = (document.getElementById('bookName')?.value?.trim()) || 'Unnamed';
    const createdBy = root.getAttribute('createdBy') || 'Unknown';
    const comment = doc.querySelector('Comment')?.textContent?.trim();

    lines.push(`📖 Price Book Name is "${bookName}" and Created By "${createdBy}".`);
    if (comment) lines.push(`💡 Purpose: ${comment}`);
    lines.push('');
    lines.push("🛠 Rules are processed top-down — first match applies.");

    const groups = Array.from(doc.getElementsByTagName('RuleGroup'));
    groups.forEach((group, gi) => {
        const enabled = group.getAttribute('enabled') === 'false' ? 'Disabled' : 'Enabled';
        const start = (group.getAttribute('startDate') || 'unspecified').trim();
        const end = (group.getAttribute('endDate') || '').trim();
        const payer = group.getAttribute('payerAccounts');

        let header = `RuleGroup #${gi + 1}: (${enabled}) — Effective from ${start}`;
        if (end && end.toLowerCase() !== 'unspecified') header += ` to ${end}.`; else header += `.`;
        if (payer && payer.trim()) header += ` Applies only to Payer Account(s): ${payer}`;
        lines.push('');
        lines.push(header);

        const billingRules = Array.from(group.getElementsByTagName('BillingRule'));
        billingRules.forEach(rule => {
            const ruleName = rule.getAttribute('name') || '(Unnamed Rule)';
            const basic = rule.querySelector('BasicBillingRule');
            const type = basic?.getAttribute('billingRuleType') || '';
            const adj = basic?.getAttribute('billingAdjustment') || '';
            let adjPhrase = toReadableAdjustment(type, adj);
            if (adj && adj.trim().startsWith('-')) {
                adjPhrase += ' (Negative rate)';
            }

            const includeDT = rule.getAttribute('includeDataTransfer') === 'true';
            const includeRI = rule.getAttribute('includeRIPurchases') === 'true';

            lines.push(`• Billing Rule Name = "${ruleName}"`);
            lines.push(`→ Applies ${adjPhrase}`);
            lines.push(`→ ${includeDT ? 'Includes' : 'Excludes'} Data Transfer and ${includeRI ? 'Includes' : 'Excludes'} RI purchases line items.`);

            const product = rule.querySelector('Product');
            if (product) {
                const pname = product.getAttribute('productName') || 'ANY';
                lines.push(`Product Name = ${pname === 'ANY' ? 'All the Products' : pname}`);
                const filters = collectProductFilters(product);
                if (filters.length) {
                    lines.push('Filters:');
                    filters.forEach(f => lines.push(`- ${f}`));

                }
            }
        });
    });

    outputEl.innerHTML = wrapLinesAsHTML(lines);
}

async function generateAndThenSummarize() {
  try {
    const output = await generateOutput('xml');
    if (output && output.trim().startsWith('<')) {
      const nlSection = document.getElementById('nlOutputSection');
      if (nlSection) {
        nlSection.style.display = 'block';
        renderNaturalLanguageSummary();
        nlSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      console.warn('XML was empty or malformed.');
      renderNaturalLanguageSummary(); // fallback
    }
  } catch (err) {
    console.warn('Error during XML generation:', err);
    renderNaturalLanguageSummary(); // fallback on error
  }
}
