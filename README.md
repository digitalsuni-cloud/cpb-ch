
## 🎯 Overview

Custom price books allow you to develop a custom system of discounts, rates, and adjustments for customers on an individual level.

This Tool will help you build and modify the Custom Price Book easily by filling the required forms and you can also genearete the JSON or CURL payload.

## ✨ Key Features

### 📋 Rule Management
- **Rule Groups**: Organize pricing rules by date ranges and customer accounts
  - Define start and end dates for rule applicability
  - Optional PayerAccount ID filtering
  - Enable/disable rule groups without deleting
  
- **Billing Rules**: Granular pricing adjustment rules within each group
  - Named billing rules for easy identification
  - Flexible billing adjustment types (percentage discount, percentage increase, fixed rate)
  - Product-specific customization (inclusion of data transfer and RI purchases)

### 🎨 Advanced Property Filtering
Define complex product filters using multiple property types:
- **Region**: Geographic region filtering
- **Usage Type**: Specific usage categories
- **Operation**: operations type.
- **Record Type**: Cost record classifications
- **Instance Property**: EC2 instance type, size, and reservation status
- **Line Item Description**: Line item description Pattern matching (contains, starts with, regex)
- **Savings Plan Offering Type**: Savings plan specific filters

### 🔄 Drag-and-Drop Reordering
- **Intuitive drag handles** (⋮⋮) on both Rule Groups and Billing Rules
- **Keyboard alternative**: Arrow buttons (▲ ▼) for accessibility
- **Real-time updates**: Navigation and UI refresh automatically after reordering
- **Precise control**: Drag only from handles, not from anywhere on elements

### 📤 Multi-Format Export
Generate outputs in multiple formats:
- **XML**: Complete specification format for AWS integration
- **JSON**: Structured data format with embedded XML specification
- **cURL Commands**: Ready-to-use API calls for immediate deployment

### 📥 Flexible Import
Support for multiple file formats:
- **XML** price book specifications
- **JSON** with embedded XML
- **Auto-detection** of format and error-recovery mechanisms
- **Smart parsing**: Handles malformed JSON with fallback extraction

### 🌍 Customer Assignment
Generate customer assignment configurations:
- **JSON format**: Structured customer-to-pricebook mappings
- **cURL commands**: API-ready deployment instructions
- **API ID and Payer ID**: Custom routing to specific price books

### 🤖 Natural Language Summary
- **AI-powered summaries**: Human-readable descriptions of pricing rules
- **Generated on-demand**: Click "Read Out Pricebook" to generate
- **Collapsible interface**: Clean UI with expand/collapse functionality
- **Smooth scrolling**: Auto-scroll to summary section

### 🎨 Theme Support
- **Dark/Light mode**: Automatic detection based on system preferences
- **Manual toggle**: Switch themes with button control
- **Persistent styling**: Clean, modern UI with accessibility focus

### 🔍 Smart Navigation
- **Select2 search dropdown**: Quickly find and jump to specific billing rules
- **Dynamic indexing**: Auto-numbered rule identification (1.1, 1.2, etc.)
- **Hover tooltips**: Full rule names with date ranges
- **Auto-expand**: Collapses expand sections when navigating

### ✅ Form Validation
- **Required field validation**: Book Name and Created By
- **Visual feedback**: Error messages and border highlighting
- **Accessible errors**: ARIA labels for screen readers
- **Focus management**: Auto-scroll to first invalid field

## 🏗️ Technical Architecture

### Frontend Stack
- **Vanilla JavaScript**: No framework dependencies
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS variables for theming
- **DOM Manipulation**: Direct and efficient DOM updates

### Core Technologies
- **Drag and Drop API**: Native HTML5 drag-and-drop with custom logic
- **FileReader API**: Client-side file import with format detection
- **DOMParser**: XML/JSON parsing with error handling
- **Select2**: Advanced dropdown search functionality
- **Local Exports**: Direct browser download capability

### Key Functions

#### Rule Management
- `addRuleGroup()`: Create new rule groups
- `addRule()`: Add billing rules to groups
- `removeRuleGroup()`: Delete rule groups
- `removeRule()`: Delete billing rules
- `moveElement()`: Reorder via keyboard buttons

#### Drag and Drop
- `initializeDragAndDrop()`: Setup drag functionality
- `attachDragToRuleGroup()`: Wire rule group dragging
- `attachDragToRule()`: Wire billing rule dragging
- `setupDragContainers()`: Configure drop zones
- `getDragAfterElement()`: Calculate drop position

#### Data Management
- `generateOutput()`: Create XML/JSON/cURL outputs
- `handleXMLImport()`: Parse XML specifications
- `handleJSONImport()`: Parse JSON price books
- `detectAndImport()`: Auto-detect file format
- `populateFieldsFromXMLString()`: Populate UI from XML

#### Property Management
- `addSelectedProperty()`: Add property filters
- `updatePropertyStatus()`: Track property usage
- `updateActiveTags()`: Display active filters
- `importProperties()`: Restore properties on import

#### UI/UX
- `updateNavigation()`: Refresh rule search dropdown
- `toggleRuleGroupCollapse()`: Expand/collapse groups
- `toggleBillingRuleCollapse()`: Expand/collapse rules
- `renderNaturalLanguageSummary()`: Generate AI summaries
- `toggleTheme()`: Switch dark/light mode

## 🚀 Getting Started
1. Here is the webpage link : https://digitalsuni-cloud.github.io/cpb-ch/

### Basic Usage

#### Creating a Price Book
1. **Enter book details**: Fill in Book Name and Created By fields
2. **Add Rule Group**: Click "Add Rule Group" to create a date-based container
3. **Configure dates**: Set Start Date (required) and optional End Date
4. **Add Billing Rules**: Click "Add Billing Rule" to add pricing adjustments
5. **Set adjustments**: Configure billing type and adjustment amount
6. **Add filters**: Use property filters to target specific products/usage patterns
7. **Reorder**: Drag ⋮⋮ handles or use arrow buttons to arrange rules

#### Exporting Your Work
1. **Generate outputs**: Click output format buttons (XML, JSON, cURL)
2. **Copy to clipboard**: Use copy buttons next to outputs
3. **Download**: Use download buttons to save files locally
4. **Deploy**: Use generated cURL commands for immediate API deployment

#### Importing Existing Price Books
1. **Click Import button**: Select "Import Price Book"
2. **Choose file**: Select XML or JSON format price book
3. **Automatic population**: Form fields and rules auto-populate
4. **Edit as needed**: Modify imported rules and regenerate outputs

## 📊 Data Structure

### XML Format
```xml
<?xml version="1.0" encoding="UTF-8"?>
<specification createdBy="John Doe" version="1.0">
  <RuleGroup startDate="2025-01-01" endDate="2025-12-31" enabled="true">
    <BillingRule name="Q1 Discount">
      <BasicBillingRule billingAdjustment="-10" billingRuleType="percentDiscount" />
      <Product productName="Amazon EC2" includeDataTransfer="true">
        <Region name="us-east-1" />
        <UsageType name="BoxUsage:t3.large" />
      </Product>
    </BillingRule>
  </RuleGroup>
</specification>
```

### JSON Format
```json
{
  "book_name": "Q1 2025 Pricing",
  "created_by": "John Doe",
  "specification": "<?xml version=\"1.0\"?>..."
}
```

## 🎮 User Interactions

### Keyboard Shortcuts
- **Tab navigation**: Navigate between form fields
- **Enter key**: Submit forms
- **Escape**: Close modals and dropdowns

### Mouse Interactions
- **Drag ⋮⋮ handles**: Reorder rules with visual feedback
- **Click to expand/collapse**: Reveal detailed rule configurations
- **Search dropdown**: Type to filter rule list

## 🔐 Data Privacy
- **Client-side processing**: All data processing happens in the browser
- **No server uploads**: Price books never leave your computer
- **Local storage**: Optionally save work (custom implementation)
- **Export control**: You control when and where data is exported

## 🌐 Browser Support
- **Modern browsers**: Chrome, Firefox, Safari, Edge
- **HTML5 required**: Drag-and-drop, FileReader APIs
- **JavaScript ES6+**: Arrow functions, template literals, modern DOM APIs

## 📦 File Structure
```
cpb-builder/
├── index.html          # Main HTML structure
├── script.js           # Complete JavaScript logic
├── style.css           # Styling and theming
└── README.md           # This file
```

## 🛠️ Customization

### Adding New Property Types
Edit `propertyTypes` object in `script.js`:
```javascript
const propertyTypes = {
    customProperty: { name: 'Custom Name', type: 'standard' },
    // Add more properties...
};
```

### Theming
Modify CSS variables in style.css for dark/light mode colors:
```css
:root {
    --primary: #007bff;
    --success: #28a745;
    --danger: #dc3545;
}

[data-theme="dark"] {
    --primary: #0d6efd;
    /* Override colors for dark mode */
}
```

## 🐛 Known Limitations
- Large price books (1000+ rules) may experience slight UI lag
- Complex regex patterns require careful testing
- Import format detection is best-effort (explicit format selection recommended for edge cases)

## 📝 Changelog

### Version 3.0 (Current)
- ✅ Full rule management system
- ✅ Drag-and-drop reordering
- ✅ Multi-format import/export
- ✅ Advanced property filtering
- ✅ Natural language summaries
- ✅ Customer assignment generation
- ✅ Dark/light theme support
- ✅ Keyboard accessibility

## 🤝 Contributing
Contributions are welcome! Please follow these guidelines:
1. Test all changes thoroughly
2. Maintain backward compatibility
3. Add comments for complex logic
4. Follow existing code style
5. Update README.md with new features

## 📄 License
Unlicense

## 👨‍💻 Author
[Sunil Gowda/CloudHealth]

## 📞 Support
For issues, feature requests, or questions:
- Create an issue on GitHub
- Check existing documentation
- Review troubleshooting section

## 🎓 Best Practices

### Rule Organization
1. Group related rules by customer segment or time period
2. Use descriptive rule names (e.g., "Q1 Large Customer 20% Discount")
3. Order rules by specificity (most specific first)
4. Test rules with sample data before deployment

### Performance Optimization
1. Keep rule count under 500 per price book
2. Use specific filters to reduce evaluation time
3. Archive old price books to maintain performance
4. Regularly test export/import cycles

### Backup and Version Control
1. Export price books regularly
2. Store JSON backups in version control
3. Document rule changes with timestamps
4. Maintain audit trail of modifications

## 🚀 Deployment
1. Generate cURL command from "Customer Assignment"
2. Copy API credentials (API ID, Payer ID)
3. Execute cURL commands in your deployment environment
4. Verify successful deployment in AWS console

---

**Happy pricing! 🎉**

For detailed feature documentation and tutorials, visit the application's built-in help (? button).
