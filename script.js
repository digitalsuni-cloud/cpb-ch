let draggedElement = null;
let draggedType = null;
let draggedSourceContainer = null;

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
    function generateAndThenSummarize() {
        const xmlField = document.getElementById('xmlOutput');

        // Step 1: Generate XML into the textarea
        if (xmlField && typeof generateXML === 'function') {
            xmlField.value = generateXML();
        }

        // Step 2: Wait until xmlOutput has content (max ~2 seconds)
        let attempts = 0;
        const maxAttempts = 20;

        const checkAndRun = setInterval(() => {
            attempts++;
            if (xmlField && xmlField.value.trim().startsWith('<')) {
                clearInterval(checkAndRun);
                if (typeof renderNaturalLanguageSummary === 'function') {
                    const nlSection = document.getElementById('nlOutputSection');
                    if (nlSection) {
                        nlSection.style.display = 'block';
                        renderNaturalLanguageSummary();
                        nlSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            } else if (attempts >= maxAttempts) {
                clearInterval(checkAndRun);
                console.warn('Timed out waiting for XML to generate.');
            }
        }, 100);
    }


    // === Assign to Read Out Pricebook button ===
    const readOutBtn = document.getElementById('readOutBtn');
    if (readOutBtn) {
        handleButtonWithRetry(readOutBtn, generateAndThenSummarize);
    }
    // === Assign same to Refresh button ===

    const refreshBtn = document.getElementById('refreshNLBtn');
    if (refreshBtn) {
        handleButtonWithRetry(refreshBtn, generateAndThenSummarize);
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

    //Read Pricebook from the Output textboxes.

    const readFromOutputBtn = document.getElementById('readFromOutputButton');
    if (readFromOutputBtn) {
        readFromOutputBtn.addEventListener('click', function () {
            const xmlOutputEl = document.getElementById('xmlOutput');
            const jsonOutputEl = document.getElementById('jsonOutput');

            if (!xmlOutputEl || !jsonOutputEl) {
                alert('XML/JSON output areas not found in the page.');
                return;
            }

            const xmlText = (xmlOutputEl.value || '').trim();
            const jsonText = (jsonOutputEl.value || '').trim();

            let chosenText = '';
            if (xmlText) {
                chosenText = xmlText;
            } else if (jsonText) {
                chosenText = jsonText;
            }

            if (!chosenText) {
                alert('No XML or JSON output found.\nPaste or generate XML/JSON first, then click "Read from Output".');
                return;
            }

            const mainFields = ['bookName', 'createdBy', 'comment', 'cxAPIId', 'cxPayerId'];
            const allFieldsEmpty = mainFields.every(id => document.getElementById(id).value.trim() === '');
            const noRuleGroups = document.getElementById('groupsContainer').children.length === 0;

            if (!(allFieldsEmpty && noRuleGroups)) {
                const ok = confirm('Reading from output will clear the existing data in the form. Continue?');
                if (!ok) return;
            }

            try {
                performReset();              // your existing helper
                detectAndImport(chosenText); // your existing import pipeline
            } catch (e) {
                console.error('ReadFromOutput error:', e);
                alert('Failed to import from output: ' + e.message);
            }
        });
    }

    setTimeout(() => {
        initializeDragAndDrop();
        setupDragContainers();
    }, 100);
});




function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        body.removeAttribute('data-theme');
    } else {
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
    select.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a property to add';
    select.appendChild(placeholder);

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
    attachDragToRuleGroup(div);
    setupDragContainers();
}

function removeRuleGroup(button) {
    const ruleGroup = button.closest('.rule-group');
    if (ruleGroup) {
        ruleGroup.remove();
        setTimeout(updateNavigation, 0);
    }
}

//Add Billing Rule
function addRule(button, addInitialProduct = true) {
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

            <!-- Products Section -->
            <div class="products-section">
            <div class="products-header">
                <h3>Products</h3>
            </div>
            <div class="products-list">
                <!-- Products added here -->
            </div>
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
    
        <button class="button button-red" onclick="removeRule(this)">
            <span class="button-icon">×</span>Remove Billing Rule </button>
    </div>
    `;
    rulesContainer.appendChild(div);

    // CHANGE: Only add initial product if flag is true
    if (addInitialProduct) {
        setTimeout(() => addProduct(ruleId), 0);
    }

    // Update navigation after adding the rule
    setTimeout(updateNavigation, 0);

    // Add event listener for rule name changes
    const ruleNameInput = div.querySelector('.ruleName');
    ruleNameInput.addEventListener('input', updateNavigation);

    attachDragToRule(div);
    setupDragContainers();
}

// Add a new product block
function addProduct(ruleId) {
    const rule = document.getElementById(ruleId);
    if (!rule) return;

    const productsList = rule.querySelector('.products-list');
    if (!productsList) return;

    const productId = 'product-' + Date.now();
    const productDiv = document.createElement('div');
    productDiv.className = 'product-block';
    productDiv.id = productId;

    productDiv.innerHTML = `
        <div class="product-header">
            <h5 class="product-title">Product: <span class="product-name-display">ANY</span></h5>
            <button type="button" class="collapse-button" onclick="toggleProductCollapse(this)">▼</button>
        </div>
        <div class="product-content">
            <div class="product-main-row">
                <div class="input-group">
                    <label>Product Name</label>
                    <input type="text" class="productName" list="productList" placeholder="Leave empty for Any Products">
                </div>
                <div class="input-group compact">
                    <label>Include Data Transfer</label>
                    <select class="productIncludeDataTransfer">
                        <option value="">(inherit)</option>
                        <option value="true">true</option>
                        <option value="false">false</option>
                    </select>
                </div>
                <div class="input-group compact">
                    <label>Include RI Purchases</label>
                    <select class="productIncludeRIPurchases">
                        <option value="">(inherit)</option>
                        <option value="true">true</option>
                        <option value="false">false</option>
                    </select>
                </div>
            </div>

            <!-- Active Properties Section for THIS product -->
            <div class="active-properties">
                <h2>Active Product Property Filters</h2>
                <div class="property-tags" id="activeTags-${productId}">
                    <!-- Tags will be populated by JavaScript -->
                </div>
            </div>

            <!-- Property Selector for THIS product -->
            <div class="property-selector">
                <select class="propertySelect">
                    <option value="">Select a property to add</option>
                </select>
                <button onclick="addSelectedPropertyToProduct('${productId}')">Add Property</button>
            </div>

            <!-- Property Sections for THIS product -->
            <div class="propertySections">
                <!-- Property sections will be dynamically added here -->
            </div>

            <button type="button" class="button button-red" onclick="removeProduct('${productId}')">
                <span class="button-icon">✕</span>Remove Product
            </button>
        </div>
    `;

    productsList.appendChild(productDiv);

    // Initialize property selector for this product
    const product = document.getElementById(productId);
    product.addedProperties = new Set();
    initializePropertySelector(product.querySelector('.propertySelect'));

    // Add listener to update header when product name changes
    const productNameInput = product.querySelector('.productName');
    const productNameDisplay = product.querySelector('.product-name-display');

    productNameInput.addEventListener('input', function () {
        const name = this.value.trim();
        productNameDisplay.textContent = name || 'ANY';
    });

    // Remove existing "Add Product" button if any
    const existingAddButton = productsList.querySelector('.add-product-button');
    if (existingAddButton) {
        existingAddButton.remove();
    }

    // Add "Add Product" button at the bottom
    const addProductBtn = document.createElement('button');
    addProductBtn.type = 'button';
    addProductBtn.className = 'button add-product-button';
    addProductBtn.onclick = () => addProduct(ruleId);
    addProductBtn.innerHTML = '<span class="button-icon">➕</span>Add Product';
    productsList.appendChild(addProductBtn);
}

// Remove a product
function removeProduct(productId) {
    const product = document.getElementById(productId);
    if (!product) return;

    const productsList = product.closest('.products-list');
    if (!productsList) return;

    // Keep at least one product
    if (productsList.querySelectorAll('.product-block').length <= 1) {
        alert('A billing rule must have at least one product. Clear the product name if you want "Any Products".');
        return;
    }

    product.remove();
    setTimeout(updateNavigation, 0);
}

// Toggle product collapse
function toggleProductCollapse(button) {
    const product = button.closest('.product-block');
    const content = product.querySelector('.product-content');
    button.classList.toggle('collapsed');
    content.classList.toggle('collapsed');

    if (button.classList.contains('collapsed')) {
        button.textContent = '▶';
    } else {
        button.textContent = '▼';
    }
}

// Add selected property to a specific product
function addSelectedPropertyToProduct(productId, autoExpand = true) {
    const product = document.getElementById(productId);
    if (!product) return;

    const select = product.querySelector('.propertySelect');
    const propertyType = select.value;
    if (!propertyType) return;

    // Collapse all expanded sections in this product
    product.querySelectorAll('.property-content.expanded').forEach(content => {
        content.classList.remove('expanded');
    });

    removeUnusedPropertiesFromProduct(product);

    if (!product.addedProperties) {
        product.addedProperties = new Set();
    }

    if (!product.addedProperties.has(propertyType)) {
        addPropertySectionToProduct(propertyType, product);
        product.addedProperties.add(propertyType);
        addValueToProduct(propertyType, product);

        // Only expand on user add, not on import
        if (autoExpand) {
            const newContent = product.querySelector(`#${propertyType}Content-${productId}`);
            if (newContent) {
                newContent.classList.add('expanded');
            }
        }
    }
    updatePropertySelectForProduct(select, product);
}


// Remove unused properties from a product
function removeUnusedPropertiesFromProduct(product) {
    if (!product.addedProperties) return;

    product.addedProperties.forEach(propertyType => {
        const status = product.querySelector(`#${propertyType}Status-${product.id}`);
        if (status && status.textContent === 'Not in use') {
            const section = product.querySelector(`#${propertyType}Section-${product.id}`);
            if (section) {
                section.remove();
                product.addedProperties.delete(propertyType);
            }
        }
    });
    updatePropertySelectForProduct(product.querySelector('.propertySelect'), product);
}

// Update property select for a product
function updatePropertySelectForProduct(select, product) {
    if (!select) return;

    select.innerHTML = '<option value="">Select a property to add</option>';

    for (const [key, value] of Object.entries(propertyTypes)) {
        if (!product.addedProperties || !product.addedProperties.has(key)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = value.name;
            select.appendChild(option);
        }
    }
}

// Add property section to a specific product
function addPropertySectionToProduct(propertyType, product) {
    const container = product.querySelector('.propertySections');
    const productId = product.id;

    const section = document.createElement('div');
    section.className = 'property-section';
    section.id = `${propertyType}Section-${productId}`;

    const header = document.createElement('div');
    header.className = 'property-header';
    header.style.cursor = 'pointer';
    header.onclick = () => toggleSectionForProduct(propertyType, product);
    header.innerHTML = `
        <div class="header-content">
            <h5>${propertyTypes[propertyType].name}</h5>
            <span class="status" id="${propertyType}Status-${productId}">Not in use</span>
        </div>
    `;

    const content = document.createElement('div');
    content.className = 'property-content';
    content.id = `${propertyType}Content-${productId}`;

    const valuesContainer = document.createElement('div');
    valuesContainer.id = `${propertyType}Values-${productId}`;

    const addButton = document.createElement('button');
    addButton.className = 'add-value';
    addButton.textContent = `Add ${propertyTypes[propertyType].name}`;
    addButton.onclick = (e) => {
        e.stopPropagation();
        addValueToProduct(propertyType, product);
    };

    content.appendChild(valuesContainer);
    content.appendChild(addButton);

    section.appendChild(header);
    section.appendChild(content);
    container.appendChild(section);

    toggleSectionForProduct(propertyType, product);
}

// Toggle section for a product
function toggleSectionForProduct(propertyType, product) {
    const productId = product.id;
    const content = product.querySelector(`#${propertyType}Content-${productId}`);

    if (!content) return;

    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        if (!product.expandedSections) {
            product.expandedSections = new Set();
        }
        product.expandedSections.delete(propertyType);
    } else {
        content.classList.add('expanded');
        if (!product.expandedSections) {
            product.expandedSections = new Set();
        }
        product.expandedSections.add(propertyType);
    }
}

// Add value to a product's property
function addValueToProduct(propertyType, product) {
    const productId = product.id;
    const container = product.querySelector(`#${propertyType}Values-${productId}`);
    if (!container) return;

    const div = document.createElement('div');

    switch (propertyTypes[propertyType].type) {
        case 'standard':
            div.className = 'property-value';
            div.innerHTML = `
                <input type="text" placeholder="Enter ${propertyTypes[propertyType].name}" 
                       onchange="updatePropertyStatusForProduct('${propertyType}', this, '${productId}')">
                <button onclick="removeValueFromProduct(this, '${propertyType}', '${productId}')">×</button>
            `;
            break;
        case 'instance':
            div.className = 'instance-property-value';
            div.innerHTML = `
                <input type="text" placeholder="Instance Type" onchange="updatePropertyStatusForProduct('${propertyType}', this, '${productId}')">
                <input type="text" placeholder="Instance Size" onchange="updatePropertyStatusForProduct('${propertyType}', this, '${productId}')">
                <select onchange="updatePropertyStatusForProduct('${propertyType}', this, '${productId}')">
                    <option value="false">Not Reserved</option>
                    <option value="true">Reserved</option>
                </select>
                <button onclick="removeValueFromProduct(this, '${propertyType}', '${productId}')">×</button>
            `;
            break;
        case 'lineItem':
            div.className = 'line-item-description-value';
            div.innerHTML = `
                <select onchange="updatePropertyStatusForProduct('${propertyType}', this, '${productId}')">
                    <option value="contains">Contains</option>
                    <option value="startsWith">Starts With</option>
                    <option value="matchesRegex">Matches Regex</option>
                </select>
                <input type="text" placeholder="Enter description" onchange="updatePropertyStatusForProduct('${propertyType}', this, '${productId}')">
                <button onclick="removeValueFromProduct(this, '${propertyType}', '${productId}')">×</button>
            `;
            break;
    }

    container.appendChild(div);
    updatePropertyStatusForProduct(propertyType, div, productId);
}

// Remove value from product
function removeValueFromProduct(button, propertyType, productId) {
    const element = button.closest('.property-value, .instance-property-value, .line-item-description-value');
    if (element) {
        element.remove();
        const product = document.getElementById(productId);
        const container = product.querySelector(`#${propertyType}Values-${productId}`);
        updatePropertyStatusForProduct(propertyType, container, productId);
    }
}

// Update property status for a product
function updatePropertyStatusForProduct(propertyType, element, productId) {
    const product = document.getElementById(productId);
    if (!product) return;

    const container = product.querySelector(`#${propertyType}Values-${productId}`);
    if (!container) return;

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

    const status = product.querySelector(`#${propertyType}Status-${productId}`);
    if (status) {
        status.textContent = hasValues ? 'In use' : 'Not in use';
        status.className = `status ${hasValues ? 'active' : ''}`;
    }

    updateActiveTagsForProduct(product);
}

// Update active tags for a product (CORRECTED selector)
function updateActiveTagsForProduct(product) {
    const productId = product.id;
    const container = product.querySelector(`#activeTags-${productId}`);
    if (!container) {
        return;
    }

    container.innerHTML = '';

    if (!product.addedProperties || product.addedProperties.size === 0) {
        return;
    }

    product.addedProperties.forEach(propertyType => {
        const valueContainer = product.querySelector(`#${propertyType}Values-${productId}`);
        if (!valueContainer) {
            return;
        }

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
                const content = product.querySelector(`#${propertyType}Content-${productId}`);
                if (content) {
                    content.classList.toggle('expanded');
                    content.classList.toggle('collapsed');
                }
            };
            tag.innerHTML = `${propertyTypes[propertyType].name}<span class="count">${activeCount}</span>`;
            container.appendChild(tag);
        }
    });
}

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
    ruleSearch.append(new Option('Select or search for a Billing Rule...', '', true, true));

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
        placeholder: 'Select or search for a Billing Rule...',
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


function generateOutput(type) {
    if (!validateForm()) {
        return Promise.reject('Validation failed');
    }

    showLoadingIndicator();

    return new Promise((resolve) => {
        setTimeout(() => {
            let output = '';
            switch (type) {
                case 'xml':
                    output = generateXML();
                    if (output) {
                        document.getElementById('xmlOutput').value = output;
                    }
                    break;
                case 'json':
                    output = generateJSON();
                    if (output) {
                        document.getElementById('jsonOutput').value = output;
                        updateAssignCustomerJSON('<PriceBookID_From_Previous_Command_Output>');
                        updateAssignCustomerAccountJSON('<PriceBookAssignmentID_From_Previous_Command_Output>');
                    }
                    break;
                case 'curl':
                    output = generateCURL();
                    if (output) {
                        document.getElementById('jsonOutput').value = output;
                        updateAssignCustomerCurl('<PriceBookID_From_Previous_Command_Output>');
                        updateAssignCustomerAccountCurl('<PriceBookAssignmentID_From_Previous_Command_Output>');
                    }
                    break;
            }
            hideLoadingIndicator();
            resolve(output);
        }, 500);
    });
}
function generateAndThenSummarize() {
    generateOutput('xml')
        .then(() => {
            const nlSection = document.getElementById('nlOutputSection');
            if (nlSection) {
                nlSection.style.display = 'block';
                renderNaturalLanguageSummary();
                nlSection.scrollIntoView({ behavior: 'smooth' });
            }
        })
        .catch((error) => {
            console.warn("Error generating XML:", error);
            // Still try to render summary as fallback
            renderNaturalLanguageSummary();
        });
}

// XML Generator
function generateXML() {
    // Helper function to escape XML special characters
    function escapeXml(unsafe) {
        if (!unsafe) return '';
        return unsafe.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case "\'": return '&apos;';
                case '"': return '&quot;';
            }
        });
    }

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';

    // Book Level Info
    const bookName = document.getElementById('bookName').value;
    const createdBy = document.getElementById('createdBy').value;
    const comment = document.getElementById('comment').value;
    xml += `<PriceBook name="${escapeXml(bookName)}" createdBy="${escapeXml(createdBy)}" comment="${escapeXml(comment)}">\n`;

    // Rule Groups
    document.querySelectorAll('.rule-group').forEach(groupElement => {
        const startDateInput = groupElement.querySelector('[id^="startDate-"]');
        const endDateInput = groupElement.querySelector('[id^="endDate-"]');
        const payerAccountsInput = groupElement.querySelector('[id^="payerAccounts-"]');
        const enabledInput = groupElement.querySelector('[id^="enabled-"]');

        const startDate = startDateInput ? startDateInput.value : '';
        const endDate = endDateInput ? endDateInput.value : '';
        const payerAccounts = payerAccountsInput ? payerAccountsInput.value.trim() : '';
        const enabled = enabledInput ? enabledInput.value : 'true';

        let rgOpen = '  <RuleGroup';
        if (startDate) rgOpen += ` startDate="${startDate}"`;
        if (endDate) rgOpen += ` endDate="${endDate}"`;
        if (payerAccounts) rgOpen += ` payerAccounts="${escapeXml(payerAccounts)}"`;
        if (enabled === 'false') rgOpen += ' enabled="false"';
        rgOpen += '>\n';
        xml += rgOpen;

        // Billing Rules
        groupElement.querySelectorAll('.rule').forEach(ruleElement => {
            const ruleNameInput = ruleElement.querySelector('.ruleName');
            const ruleName = ruleNameInput ? ruleNameInput.value : '';

            const includeDataTransferInput = ruleElement.querySelector('.includeDataTransfer');
            const includeRIPurchasesInput = ruleElement.querySelector('.includeRIPurchases');

            const includeDataTransfer = includeDataTransferInput ? includeDataTransferInput.value : '';
            const includeRIPurchases = includeRIPurchasesInput ? includeRIPurchasesInput.value : '';

            let brOpen = `    <BillingRule name="${escapeXml(ruleName)}"`;
            if (includeDataTransfer) brOpen += ` includeDataTransfer="${includeDataTransfer}"`;
            if (includeRIPurchases) brOpen += ` includeRIPurchases="${includeRIPurchases}"`;
            brOpen += '>\n';
            xml += brOpen;

            const billingAdjustmentInput = ruleElement.querySelector('.billingAdjustment');
            const billingRuleTypeInput = ruleElement.querySelector('.billingRuleType');

            const billingAdjustment = billingAdjustmentInput ? billingAdjustmentInput.value : '';
            const billingRuleType = billingRuleTypeInput ? billingRuleTypeInput.value : '';

            if (billingAdjustment && billingRuleType) {
                xml += `      <BasicBillingRule billingAdjustment="${billingAdjustment}" billingRuleType="${billingRuleType}"/>\n`;
            }

            let productsXML = '';

            // Products
            ruleElement.querySelectorAll('.product-block').forEach(productBlock => {
                const productId = productBlock.id;

                const productNameInput = productBlock.querySelector('.productName');
                const rawProductName = productNameInput ? productNameInput.value.trim() : '';

                const productIncludeDataTransferInput = productBlock.querySelector('.productIncludeDataTransfer');
                const productIncludeRIPurchasesInput = productBlock.querySelector('.productIncludeRIPurchases');

                const productIncludeDataTransfer = productIncludeDataTransferInput ? productIncludeDataTransferInput.value : '';
                const productIncludeRIPurchases = productIncludeRIPurchasesInput ? productIncludeRIPurchasesInput.value : '';

                let propertiesXML = '';

                const propMap = {
                    region: 'Region',
                    usageType: 'UsageType',
                    operation: 'Operation',
                    recordType: 'RecordType',
                    savingsPlanOfferingType: 'SavingsPlanOfferingType'
                };

                // Standard properties
                Object.keys(propMap).forEach(propKey => {
                    const valuesContainer = productBlock.querySelector(`#${propKey}Values-${productId}`);
                    if (valuesContainer) {
                        valuesContainer.querySelectorAll('.property-value input').forEach(input => {
                            const value = input.value.trim();
                            if (value) {
                                propertiesXML += `        <${propMap[propKey]} name="${escapeXml(value)}" />\n`;
                            }
                        });
                    }
                });

                // Instance Properties
                const instanceValuesContainer = productBlock.querySelector(`#instancePropertyValues-${productId}`);
                if (instanceValuesContainer) {
                    instanceValuesContainer.querySelectorAll('.instance-property-value').forEach(instSet => {
                        const instanceTypeInput = instSet.querySelector('input:nth-of-type(1)');
                        const instanceSizeInput = instSet.querySelector('input:nth-of-type(2)');
                        const reservedSelect = instSet.querySelector('select');

                        const instanceType = instanceTypeInput ? instanceTypeInput.value.trim() : '';
                        const instanceSize = instanceSizeInput ? instanceSizeInput.value.trim() : '';
                        const reserved = reservedSelect ? reservedSelect.value : 'false';

                        if (instanceType || instanceSize || reserved) {
                            propertiesXML += `        <InstanceProperties instanceType="${escapeXml(instanceType)}" instanceSize="${escapeXml(instanceSize)}" reserved="${reserved}" />\n`;
                        }
                    });
                }

                // Line Item Descriptions
                const lineItemContainer = productBlock.querySelector(`#lineItemDescriptionValues-${productId}`);
                if (lineItemContainer) {
                    lineItemContainer.querySelectorAll('.line-item-description-value').forEach(lineSet => {
                        const operatorSelect = lineSet.querySelector('select');
                        const valueInput = lineSet.querySelector('input');

                        const operator = operatorSelect ? operatorSelect.value : 'contains';
                        const value = valueInput ? valueInput.value.trim() : '';

                        if (value) {
                            propertiesXML += `        <LineItemDescription ${operator}="${escapeXml(value)}" />\n`;
                        }
                    });
                }

                const hasLocalFlags =
                    (productIncludeDataTransfer && productIncludeDataTransfer !== 'inherit') ||
                    (productIncludeRIPurchases && productIncludeRIPurchases !== 'inherit');

                // EFFECTIVE NAME: empty means ANY
                const effectiveProductName = rawProductName || 'ANY';

                // Build Product open tag
                let prodOpen = '      <Product';
                if (effectiveProductName) {
                    prodOpen += ` productName="${escapeXml(effectiveProductName)}"`;
                }
                if (productIncludeDataTransfer && productIncludeDataTransfer !== 'inherit') {
                    prodOpen += ` includeDataTransfer="${productIncludeDataTransfer}"`;
                }
                if (productIncludeRIPurchases && productIncludeRIPurchases !== 'inherit') {
                    prodOpen += ` includeRIPurchases="${productIncludeRIPurchases}"`;
                }

                // Even if there are no filters or local flags, we still emit Product (ANY)
                if (propertiesXML) {
                    prodOpen += '>\n';
                    productsXML += prodOpen + propertiesXML + '      </Product>\n';
                } else {
                    prodOpen += ' />\n';
                    productsXML += prodOpen;
                }
            });

            xml += productsXML;
            xml += '    </BillingRule>\n';
        });

        xml += '  </RuleGroup>\n';
    });

    xml += '</PriceBook>';
    return xml;
}

function generateStandardProperty(container, tagName, xml) {
    const inputs = container.querySelectorAll('input');
    inputs.forEach(input => {
        const value = input.value.trim();
        if (value) {
            xml += `\t\t\t\t<${tagName} name="${escapeXml(value)}" />\n`;
        }
    });
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
        document.getElementById('fileInput').click();
    } else {
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
            performReset();
            detectAndImport(text);
        };
        reader.readAsText(file);
    }
});

// Content sniffing + dispatch
function detectAndImport(text) {
    let trimmed = (text || '').trim();

    if (trimmed.charCodeAt(0) === 0xFEFF) {
        trimmed = trimmed.slice(1);
    }

    if (!trimmed) {
        alert('The file is empty.');
        return;
    }

    const firstChar = trimmed[0];

    if (firstChar === '{' || firstChar === '[') {
        const ok = tryImportAsJSON(trimmed);
        if (!ok) {
            const okXML = tryImportAsXML(trimmed);
            if (!okXML) alert('Unable to parse file as JSON or XML.');
        }
        return;
    }

    if (firstChar === '<') {
        const okXML = tryImportAsXML(trimmed);
        if (!okXML) {
            const okJSON = tryImportAsJSON(trimmed);
            if (!okJSON) alert('Unable to parse file as XML or JSON.');
        }
        return;
    }

    if (looksLikeJSON(trimmed)) {
        const ok = tryImportAsJSON(trimmed);
        if (ok) return;
    }
    if (looksLikeXML(trimmed)) {
        const ok = tryImportAsXML(trimmed);
        if (ok) return;
    }

    if (!tryImportAsJSON(trimmed) && !tryImportAsXML(trimmed)) {
        alert('Unsupported or invalid file content. Please upload a valid JSON or XML.');
    }
}

function looksLikeJSON(s) {
    return /["']\s*:\s*/.test(s) && /[{[]/.test(s);
}

function looksLikeXML(s) {
    return /^<\?xml|^<\w+[\s>]/.test(s);
}

function tryImportAsJSON(text) {
    try {
        const obj = JSON.parse(text);
        const xmlString = obj && obj.specification;
        if (typeof xmlString === 'string' && xmlString.trim().startsWith('<')) {
            handleJSONImportWithXML(obj, xmlString);
            return true;
        }
        alert('JSON parsed but no "specification" XML found.');
        return false;
    } catch (e) {
        const extracted = extractXMLFromMalformedJSON(text);
        if (extracted) {
            handleJSONImportWithXML({ book_name: extracted.bookName || 'Unknown' }, extracted.xml);
            return true;
        }
        return false;
    }
}

function handleJSONImportWithXML(jsonContent, xmlString) {
    populateFieldsFromXMLString(xmlString, jsonContent);
}

function extractXMLFromMalformedJSON(raw) {
    try {
        const bookNameMatch = raw.match(/"book_name"\s*:\s*"([^"]*)"/);
        const specKeyMatch = raw.match(/"specification"\s*:\s*"/);
        if (!specKeyMatch) return null;

        const startIndex = specKeyMatch.index + specKeyMatch[0].length;
        let i = startIndex;
        let xml = '';
        let escaped = false;
        while (i < raw.length) {
            const ch = raw[i];
            if (!escaped && ch === '"') break;
            if (!escaped && ch === '\\') {
                escaped = true;
            } else {
                xml += ch;
                escaped = false;
            }
            i++;
        }
        xml = xml
            .replace(/\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');

        return { xml, bookName: bookNameMatch ? bookNameMatch[1] : undefined };
    } catch {
        return null;
    }
}

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
    document.getElementById('bookName').value = '';
    document.getElementById('createdBy').value = '';
    document.getElementById('comment').value = '';
    document.getElementById('cxAPIId').value = '';
    document.getElementById('cxPayerId').value = '';
    document.getElementById('groupsContainer').innerHTML = '';
    document.getElementById('xmlOutput').value = '';
    document.getElementById('jsonOutput').value = '';
    document.getElementById('assignCustomerJSON').value = '';
    document.getElementById('assignCustomerAccountJSON').value = '';
    document.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
}

function handleXMLImport(result) {
    populateFieldsFromXMLString(result);
}

function populateFieldsFromXMLString(xmlString, jsonContent = null) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

    const bookNameValue = jsonContent ? jsonContent.book_name : xmlDoc.documentElement.getAttribute('bookName');
    document.getElementById('bookName').value = bookNameValue || '';

    const createdByValue = xmlDoc.documentElement.getAttribute('createdBy');
    document.getElementById('createdBy').value = createdByValue || '';

    const commentValue = xmlDoc.documentElement.getAttribute('comment');
    document.getElementById('comment').value = commentValue || '';

    const cxAPIIdValue = xmlDoc.documentElement.getAttribute('cxAPIId');
    document.getElementById('cxAPIId').value = cxAPIIdValue || '';

    const cxPayerIdValue = xmlDoc.documentElement.getAttribute('cxPayerId');
    document.getElementById('cxPayerId').value = cxPayerIdValue || '';

    document.getElementById('groupsContainer').innerHTML = '';

    const ruleGroups = xmlDoc.getElementsByTagName('RuleGroup');
    Array.from(ruleGroups).forEach(ruleGroup => {
        addRuleGroup();
        const currentGroup = document.querySelector('.rule-group:last-child');

        currentGroup.querySelector('[id^="startDate-"]').value = ruleGroup.getAttribute('startDate') || '';
        currentGroup.querySelector('[id^="endDate-"]').value = ruleGroup.getAttribute('endDate') || '';
        currentGroup.querySelector('[id^="payerAccounts-"]').value = ruleGroup.getAttribute('payerAccounts') || '';
        currentGroup.querySelector('[id^="enabled-"]').value = ruleGroup.getAttribute('enabled') || 'true';

        const billingRules = ruleGroup.getElementsByTagName('BillingRule');
        Array.from(billingRules).forEach((billingRule, brIndex) => {
            if (brIndex === 0) {
                // Remove the auto-created rule for the first billing rule
                const existingRules = currentGroup.querySelectorAll('.rule');
                if (existingRules.length > 0) {
                    existingRules[0].remove();
                }
            }

            const addRuleButton = currentGroup.querySelector('.button-group button');

            // CHANGE: Pass 'false' to prevent empty product creation
            addRule(addRuleButton, false);

            const currentRule = currentGroup.querySelector('.rule:last-child');
            currentRule.querySelector('.ruleName').value = billingRule.getAttribute('name') || '';
            const basicBillingRule = billingRule.getElementsByTagName('BasicBillingRule')[0];
            currentRule.querySelector('.billingAdjustment').value = basicBillingRule.getAttribute('billingAdjustment') || '';
            currentRule.querySelector('.billingRuleType').value = basicBillingRule.getAttribute('billingRuleType') || 'percentDiscount';
            currentRule.querySelector('.includeDataTransfer').value = billingRule.getAttribute('includeDataTransfer') || 'true';
            currentRule.querySelector('.includeRIPurchases').value = billingRule.getAttribute('includeRIPurchases') || 'false';

            // Import products
            const products = billingRule.getElementsByTagName('Product');
            const productsList = currentRule.querySelector('.products-list');

            if (products.length > 0) {
                // Remove auto-created first product
                const existingProducts = productsList.querySelectorAll('.product-block');
                existingProducts.forEach(p => p.remove());

                // Add each product from XML
                Array.from(products).forEach(productEl => {
                    addProduct(currentRule.id);

                    // Get all product blocks and select the last one (excluding the button)
                    const allProducts = productsList.querySelectorAll('.product-block');
                    const currentProduct = allProducts[allProducts.length - 1];

                    if (currentProduct) {
                        // Set product name
                        const productName = productEl.getAttribute('productName') || '';
                        const productNameInput = currentProduct.querySelector('.productName');
                        if (productNameInput) {
                            productNameInput.value = productName;
                        }

                        // Update display header
                        const productNameDisplay = currentProduct.querySelector('.product-name-display');
                        if (productNameDisplay) {
                            productNameDisplay.textContent = productName || 'ANY';
                        }

                        // Set product flags
                        const productDT = currentProduct.querySelector('.productIncludeDataTransfer');
                        if (productDT) {
                            productDT.value = productEl.getAttribute('includeDataTransfer') || '';
                        }

                        const productRI = currentProduct.querySelector('.productIncludeRIPurchases');
                        if (productRI) {
                            productRI.value = productEl.getAttribute('includeRIPurchases') || '';
                        }

                        // Import properties for this product
                        importPropertiesForProduct(productEl, currentProduct);
                    }
                });
            }

        });
    });

    setTimeout(() => {
        updateNavigation();
        collapseAllProperties();
    }, 100);
}

/**
 * CORRECTED IMPORT FUNCTION - Imports ALL properties for a product
 * Key fixes:
 * 1. Ensures all property sections exist BEFORE adding values
 * 2. Adds all values to containers
 * 3. Updates property status for EACH property type
 * 4. After all updates complete, updates the active tags display
 * 5. Uses increased timeout to ensure DOM is fully updated
 */
function importPropertiesForProduct(productEl, productDiv) {
    const productId = productDiv.id;

    if (!productDiv.addedProperties) {
        productDiv.addedProperties = new Set();
    }

    // Helper to ensure a property section exists
    function ensureProperty(propertyType) {
        if (!productDiv.addedProperties.has(propertyType)) {
            addPropertySectionToProduct(propertyType, productDiv);
            productDiv.addedProperties.add(propertyType);
        }
        return productDiv.querySelector(`#${propertyType}Values-${productId}`);
    }

    // 1. STANDARD PROPERTIES
    const stdProps = [
        ['Region', 'region'],
        ['UsageType', 'usageType'],
        ['Operation', 'operation'],
        ['RecordType', 'recordType'],
        ['SavingsPlanOfferingType', 'savingsPlanOfferingType']
    ];

    stdProps.forEach(([xmlTag, propertyType]) => {
        const elements = productEl.getElementsByTagName(xmlTag);
        if (elements.length === 0) return;

        const container = ensureProperty(propertyType);

        Array.from(elements).forEach(el => {
            addValueToProduct(propertyType, productDiv);
            const lastInput = container.querySelector('.property-value:last-child input');
            if (lastInput) {
                lastInput.value = el.getAttribute('name') || '';
            }
        });
    });

    // 2. INSTANCE PROPERTIES
    const instanceProps = productEl.getElementsByTagName('InstanceProperties');
    if (instanceProps.length > 0) {
        const propertyType = 'instanceProperty';
        const container = ensureProperty(propertyType);

        Array.from(instanceProps).forEach(inst => {
            addValueToProduct(propertyType, productDiv);
            const last = container.querySelector('.instance-property-value:last-child');

            if (last) {
                const inputs = last.querySelectorAll('input');
                const sel = last.querySelector('select');

                if (inputs[0]) inputs[0].value = inst.getAttribute('instanceType') || '';
                if (inputs[1]) inputs[1].value = inst.getAttribute('instanceSize') || '';
                if (sel) sel.value = inst.getAttribute('reserved') === 'true' ? 'true' : 'false';
            }
        });
    }

    // 3. LINE ITEM DESCRIPTION
    const lineItems = productEl.getElementsByTagName('LineItemDescription');
    if (lineItems.length > 0) {
        const propertyType = 'lineItemDescription';
        const container = ensureProperty(propertyType);

        Array.from(lineItems).forEach(ld => {
            addValueToProduct(propertyType, productDiv);
            const last = container.querySelector('.line-item-description-value:last-child');

            if (last) {
                const selectEl = last.querySelector('select');
                const input = last.querySelector('input');

                ['contains', 'startsWith', 'matchesRegex'].forEach(op => {
                    if (ld.hasAttribute(op)) {
                        if (selectEl) selectEl.value = op;
                        if (input) input.value = ld.getAttribute(op) || '';
                    }
                });
            }
        });
    }

    // 4. FINAL — Update statuses THEN tags with proper sequencing
    // CRITICAL: Use 200ms timeout to ensure all DOM updates have completed
    setTimeout(() => {
        // First update status for each property
        productDiv.addedProperties.forEach(propertyType => {
            const container = productDiv.querySelector(`#${propertyType}Values-${productId}`);
            if (container) {
                updatePropertyStatusForProduct(propertyType, container, productId);
            }
        });

        // Force DOM reflow
        void productDiv.offsetHeight;

        // NOW update tags after statuses are set
        updateActiveTagsForProduct(productDiv);
    }, 200);  // INCREASED to 200ms for safety
}

/**
 * CORRECTED UPDATE ACTIVE TAGS FUNCTION
 * This properly counts active property values and creates clickable tags
 */
function updateActiveTagsForProduct(product) {
    const productId = product.id;
    const container = product.querySelector(`#activeTags-${productId}`);
    if (!container) {
        console.warn(`[Tags] Container NOT found for ${productId}`);
        return;
    }

    container.innerHTML = '';

    if (!product.addedProperties || product.addedProperties.size === 0) {
        return;
    }

    product.addedProperties.forEach(propertyType => {
        const valueContainer = product.querySelector(`#${propertyType}Values-${productId}`);
        if (!valueContainer) {
            console.warn(`[Tags] Values container not found for ${propertyType}-${productId}`);
            return;
        }

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
                const content = product.querySelector(`#${propertyType}Content-${productId}`);
                if (content) {
                    content.classList.toggle('expanded');
                }
            };
            tag.innerHTML = `${propertyTypes[propertyType].name}<span class="count">${activeCount}</span>`;
            container.appendChild(tag);
        }
    });
}

function collapseAllProperties() {
    const products = document.querySelectorAll('.product-block');
    
    products.forEach(product => {
        // 1. Collapse all property sections within this product
        const propertyContents = product.querySelectorAll('.property-content');
        propertyContents.forEach(content => {
            content.classList.add('collapsed');
            content.classList.remove('expanded');
        });

        // 2. Reset expanded sections tracking
        if (!product.expandedSections) {
            product.expandedSections = new Set();
        }
        product.expandedSections.clear();

        // 3. Collapse the product itself
        const productHeader = product.querySelector('.product-header .collapse-button');
        const productContent = product.querySelector('.product-content');
        if (productHeader && productContent) {
            productHeader.classList.add('collapsed');
            productContent.classList.add('collapsed');
            productHeader.textContent = '▶';
        }

        // 4. CRITICAL: Rebuild tags after collapsing
        updateActiveTagsForProduct(product);
    });

    // 5. Collapse all Billing Rules
    const billingRules = document.querySelectorAll('.rule');
    billingRules.forEach(rule => {
        const header = rule.querySelector('.rule-header .collapse-button');
        const content = rule.querySelector('.rule-content');
        
        if (header && content) {
            header.classList.add('collapsed');
            content.classList.add('collapsed');
            header.textContent = '▶';
        }
    });

    // 6. Collapse all Rule Groups
    const ruleGroups = document.querySelectorAll('.rule-group');
    ruleGroups.forEach(group => {
        const header = group.querySelector('.rule-group-header .collapse-button');
        const content = group.querySelector('.rule-group-content');
        
        if (header && content) {
            header.classList.add('collapsed');
            content.classList.add('collapsed');
            header.textContent = '▶';
        }
    });
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

//Reset all fields.
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
    if (t.includes('fixed') || t.includes('rate')) return `a fixed rate of $${adj}`;
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

    // Book name and createdBy
    const bookNameField = document.getElementById('bookName')?.value?.trim();
    const bookName = bookNameField || root.getAttribute('name') || 'Unnamed';
    const createdBy = root.getAttribute('createdBy') || 'Unknown';

    // Comment: prefer XML attribute, fall back to form field
    const commentAttr = root.getAttribute('comment');
    const commentField = document.getElementById('comment')?.value?.trim();
    const comment = (commentAttr && commentAttr.trim()) || commentField || '';

    lines.push(`📖 Price Book Name is "${bookName}" and Created By "${createdBy}".`);
    if (comment) lines.push(`💡 Purpose: ${comment}`);
    lines.push('');
    lines.push('🛠 Rules are processed top-down — first match applies.');

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
            lines.push(
                `→ ${includeDT ? 'Includes' : 'Excludes'} Data Transfer and ` +
                `${includeRI ? 'Includes' : 'Excludes'} RI Purchase line items.`
            );

            const products = Array.from(rule.getElementsByTagName('Product'));

            if (products.length === 0) {
                lines.push('No product filters defined.');
            } else {
                products.forEach((productEl, idx) => {
                    const pname = productEl.getAttribute('productName') || 'ANY';
                    const filters = collectProductFilters(productEl);

                    let pHeader = `Product #${idx + 1}: `;
                    pHeader += (pname === 'ANY' ? 'All Products' : pname);
                    lines.push(pHeader);

                    if (filters.length) {
                        filters.forEach(f => lines.push(`- ${f}`));
                    } else {
                        lines.push('- (no additional filters)');
                    }
                });
            }
        });
    });

    outputEl.innerHTML = wrapLinesAsHTML(lines);
}
// handleButtonWithRetry function to doublelcik the NL Summary refresh button
function handleButtonWithRetry(button, handler) {
    let isAutoRetry = false;

    button.addEventListener('click', function (event) {
        if (isAutoRetry) {
            // This is the automatic second click - just execute and reset
            isAutoRetry = false;
            handler.call(this, event);
            return;
        }

        // This is a manual first click
        handler.call(this, event);

        // Schedule the automatic second click
        setTimeout(() => {
            isAutoRetry = true;
            this.click();
        }, 600);
    });
}

// ========== DRAG AND DROP FUNCTIONALITY ==========

function initializeDragAndDrop() {
    document.querySelectorAll('.rule-group').forEach(group => {
        attachDragToRuleGroup(group);
    });
    document.querySelectorAll('.rule').forEach(rule => {
        attachDragToRule(rule);
    });
    setupDragContainers();
}

function attachDragToRuleGroup(groupEl) {
    if (groupEl.getAttribute('data-draggable-init') === '1') return;
    groupEl.setAttribute('data-draggable-init', '1');
    const header = groupEl.querySelector('.rule-group-header h3');
    if (!header) return;

    if (!header.querySelector('.drag-handle')) {
        const handle = document.createElement('span');
        handle.className = 'drag-handle';
        handle.textContent = '⋮⋮';
        handle.title = 'Drag to reorder Rule Group';
        handle.setAttribute('aria-label', 'Drag to reorder Rule Group');
        handle.setAttribute('role', 'button');
        handle.setAttribute('tabindex', '0');
        handle.style.marginRight = '10px';
        handle.style.cursor = 'grab';

        // ✅ Enable dragging ONLY when handle is grabbed
        handle.addEventListener('mousedown', function (e) {
            e.stopPropagation();
            groupEl.setAttribute('draggable', 'true');
        });

        handle.addEventListener('mouseup', function () {
            groupEl.setAttribute('draggable', 'false');
        });

        header.insertBefore(handle, header.firstChild);
    }

    // ✅ Start with draggable=false
    groupEl.setAttribute('draggable', 'false');

    groupEl.addEventListener('dragstart', function (e) {
        // ✅ Only allow drag if draggable is true
        if (this.getAttribute('draggable') !== 'true') {
            e.preventDefault();
            return;
        }

        draggedElement = this;
        draggedType = 'group';
        draggedSourceContainer = document.getElementById('groupsContainer');
        setTimeout(() => this.classList.add('dragging'), 0);
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', 'group');
        }
    });

    groupEl.addEventListener('dragend', function () {
        this.classList.remove('dragging');
        this.setAttribute('draggable', 'false'); // Reset after drag
        draggedElement = null;
        draggedType = null;
        draggedSourceContainer = null;
    });
}

function attachDragToRule(ruleEl) {
    if (ruleEl.getAttribute('data-draggable-init') === '1') return;
    ruleEl.setAttribute('data-draggable-init', '1');
    const header = ruleEl.querySelector('.rule-header h4');
    if (!header) return;

    if (!header.querySelector('.drag-handle')) {
        const handle = document.createElement('span');
        handle.className = 'drag-handle';
        handle.textContent = '⋮⋮';
        handle.title = 'Drag to reorder Billing Rule';
        handle.setAttribute('aria-label', 'Drag to reorder Billing Rule');
        handle.setAttribute('role', 'button');
        handle.setAttribute('tabindex', '0');
        handle.style.marginRight = '10px';
        handle.style.cursor = 'grab';

        // ✅ Enable dragging ONLY when handle is grabbed
        handle.addEventListener('mousedown', function (e) {
            e.stopPropagation(); // Prevent bubbling to parent
            ruleEl.setAttribute('draggable', 'true');
        });

        handle.addEventListener('mouseup', function () {
            ruleEl.setAttribute('draggable', 'false');
        });

        header.insertBefore(handle, header.firstChild);
    }

    // ✅ Start with draggable=false (only enabled when handle grabbed)
    ruleEl.setAttribute('draggable', 'false');

    ruleEl.addEventListener('dragstart', function (e) {
        // ✅ Only allow drag if draggable is true (handle was grabbed)
        if (this.getAttribute('draggable') !== 'true') {
            e.preventDefault();
            return;
        }

        e.stopPropagation(); // Prevent bubbling to Rule Group
        console.log('🟢 RULE DRAG START');
        draggedElement = this;
        draggedType = 'rule';
        draggedSourceContainer = this.closest('.rules');
        console.log('Source container:', draggedSourceContainer);
        setTimeout(() => this.classList.add('dragging'), 0);
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', 'rule');
        }
    });

    ruleEl.addEventListener('dragend', function () {
        console.log('🔴 RULE DRAG END');
        this.classList.remove('dragging');
        this.setAttribute('draggable', 'false'); // Reset after drag
        draggedElement = null;
        draggedType = null;
        draggedSourceContainer = null;
    });
}
function setupDragContainers() {
    const groupsContainer = document.getElementById('groupsContainer');
    if (groupsContainer && groupsContainer.getAttribute('data-drop-init') !== '1') {
        groupsContainer.setAttribute('data-drop-init', '1');
        groupsContainer.addEventListener('dragover', function (e) {
            if (!draggedElement || draggedType !== 'group') return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            const afterEl = getDragAfterElement(this, e.clientY, '.rule-group');
            if (!afterEl) {
                this.appendChild(draggedElement);
            } else {
                this.insertBefore(draggedElement, afterEl);
            }
        });
        groupsContainer.addEventListener('drop', function (e) {
            if (!draggedElement || draggedType !== 'group') return;
            e.preventDefault();
            setTimeout(() => { updateNavigation(); }, 0);
        });
    }

    document.querySelectorAll('.rules').forEach(rulesContainer => {
        if (rulesContainer.getAttribute('data-drop-init') === '1') return;
        rulesContainer.setAttribute('data-drop-init', '1');

        rulesContainer.addEventListener('dragover', function (e) {

            if (!draggedElement || draggedType !== 'rule') {
                return;
            }

            const targetContainer = this;

            if (draggedSourceContainer !== targetContainer) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

            const afterEl = getDragAfterElement(targetContainer, e.clientY, '.rule');

            if (!afterEl) {
                targetContainer.appendChild(draggedElement);
            } else {
                targetContainer.insertBefore(draggedElement, afterEl);
            }
        });

        rulesContainer.addEventListener('drop', function (e) {
            if (!draggedElement || draggedType !== 'rule') return;
            if (draggedSourceContainer !== this) return;
            e.preventDefault();
            e.stopPropagation();
            setTimeout(() => { updateNavigation(); }, 0);
        });
    });
}

function getDragAfterElement(container, mouseY, selector) {
    const draggableElements = [...container.querySelectorAll(selector + ':not(.dragging)')];
    return draggableElements.reduce(
        (closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = mouseY - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        },
        { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
}

// Helper Funciton for the multiple product names under as single billing rule
function addProductRow(buttonEl) {
    const rule = buttonEl.closest('.rule');
    const container = rule.querySelector('.products-container');
    if (!container) return;

    const firstRow = container.querySelector('.product-row');
    if (!firstRow) return;

    const newRow = firstRow.cloneNode(true);

    // clear values in cloned row
    const nameInput = newRow.querySelector('.productName');
    const dtSelect = newRow.querySelector('.productIncludeDataTransfer');
    const riSelect = newRow.querySelector('.productIncludeRIPurchases');

    if (nameInput) nameInput.value = '';
    if (dtSelect) dtSelect.value = '';
    if (riSelect) riSelect.value = '';

    container.appendChild(newRow);
}

function removeProductRow(buttonEl) {
    const row = buttonEl.closest('.product-row');
    const container = buttonEl.closest('.products-container');
    if (!row || !container) return;

    // keep at least one row to avoid empty container
    const rows = container.querySelectorAll('.product-row');
    if (rows.length <= 1) {
        // just clear values instead of removing
        const nameInput = row.querySelector('.productName');
        const dtSelect = row.querySelector('.productIncludeDataTransfer');
        const riSelect = row.querySelector('.productIncludeRIPurchases');

        if (nameInput) nameInput.value = '';
        if (dtSelect) dtSelect.value = '';
        if (riSelect) riSelect.value = '';
        return;
    }

    row.remove();
}
