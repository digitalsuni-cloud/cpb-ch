const { JSDOM } = require("jsdom");
const dom = new JSDOM();
const DOMParser = dom.window.DOMParser;
const xmlString = `<?xml version="1.0" encoding="UTF-8"?> 
<CHTBillingRules createdBy="CloudHealth"  date="11/07/18">          
   <RuleGroup startDate="2025-01-01">              
        <BillingRule name="Custom Cloudfront transfer price Hong Kong, Philippines, S. Korea, Singapore & Taiwan" includeDataTransfer="true">                                                        
            <BasicBillingRule billingAdjustment="0.100000" billingRuleType="fixedRate"/>
            <Product productName="CloudFront">                                                                            
                <UsageType name="AP-DataTransfer-Out-Bytes"/>
            </Product>
        </BillingRule>
    </RuleGroup>
</CHTBillingRules>`;

const cleanedXmlString = xmlString.replace(/&(?!amp;|lt;|gt;|apos;|quot;|#X?[0-9a-fA-F]+;|#\d+;)/g, '&amp;');

const parser = new DOMParser();
let xmlDoc = parser.parseFromString(xmlString, 'application/xml');
console.log("Original parsed has error:", xmlDoc.getElementsByTagName('parsererror').length > 0);

xmlDoc = parser.parseFromString(cleanedXmlString, 'application/xml');
console.log("Cleaned parsed has error:", xmlDoc.getElementsByTagName('parsererror').length > 0);
console.log("Cleaned string:", cleanedXmlString.substring(200, 300));
