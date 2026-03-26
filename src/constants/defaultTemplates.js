/**
 * Built-in out-of-the-box pricebook templates.
 *
 * Each entry is stored as raw XML so it benefits from parseXMLToState's
 * full parsing pipeline (attribute extraction, sanitisation, etc.).
 *
 * To add more templates, just append another object to the array.
 */

export const DEFAULT_TEMPLATES = [
    {
        id: '__builtin_remove_discounts__',
        name: 'Remove Private & EDP Discounts',
        description: 'Zeros out Private Rate Discount and Enterprise Discount Program line items. Use this as a baseline for list-price or cost-plus pricebooks.',
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<CHTBillingRules createdBy="CloudHealth" date="2026-03-26">
  <Comment>This Pricebook will zero out the Private Rate Discounts and EDP Discount Line Items</Comment>
  <RuleGroup startDate="2023-05-01">
    <BillingRule name="Remove Private Pricing Discount" includeDataTransfer="true">
      <BasicBillingRule billingAdjustment="0" billingRuleType="fixedRate" />
      <Product productName="ANY">
        <LineItemDescription contains="Private Rate Discount" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2021-11-01">
    <BillingRule name="Remove EDP Discounts" includeDataTransfer="true">
      <BasicBillingRule billingAdjustment="0" billingRuleType="fixedRate" />
      <Product productName="ANY">
        <LineItemDescription contains="Enterprise Discount Program" />
        <LineItemDescription contains="Enterprise Program Discount" />
      </Product>
    </BillingRule>
  </RuleGroup>
</CHTBillingRules>`
    },
    {
        id: '__builtin_cloudwatch_list_price__',
        name: 'CloudWatch List Pricing (On-Demand)',
        description: 'Adjusts CloudWatch pricing to public On-Demand rate, specifically overriding standard log class processing and dashboard costs.',
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<CHTBillingRules createdBy="CloudHealth" date="2026-03-26">
  <Comment>Adjusting CloudWatch Pricing to Public On Demand Rate.</Comment>
  <RuleGroup startDate="2025-01-01">
    <BillingRule name="CloudWatch Data Storage-USE1" includeDataTransfer="true">
      <BasicBillingRule billingAdjustment="0.03" billingRuleType="fixedRate" />
      <Product productName="AmazonCloudWatch">
        <UsageType name="USE1-TimedStorage-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-01-01">
    <BillingRule name="CloudWatch Custom log data ingested in Standard log class - USE1" includeDataTransfer="true">
      <BasicBillingRule billingAdjustment="0.5" billingRuleType="fixedRate" />
      <Product productName="AmazonCloudWatch">
        <UsageType name="USE1-DataProcessing-Bytes" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-01-01">
    <BillingRule name="CloudWatch Custom log data ingested in Standard log class - EUC1" includeDataTransfer="true">
      <BasicBillingRule billingAdjustment="0.63" billingRuleType="fixedRate" />
      <Product productName="AmazonCloudWatch">
        <UsageType name="EUC1-DataProcessing-Bytes" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-01-01">
    <BillingRule name="CloudWatch Dashboard per Month" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="3" billingRuleType="fixedRate" />
      <Product productName="AmazonCloudWatch">
        <UsageType name="DashboardsUsageHour-Basic" />
      </Product>
    </BillingRule>
  </RuleGroup>
</CHTBillingRules>`
    },
    {
        id: '__builtin_cloudfront_list_price__',
        name: 'CloudFront HTTP/S List Pricing',
        description: 'Applies standard public list prices for CloudFront HTTP and HTTPS request usage across major global regions.',
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<CHTBillingRules createdBy="CloudHealth" date="2026-03-26">
  <Comment>This Pricebook applies the standard list price rate for Cloudfront HTTP/S data requests across specific regions.</Comment>
  <RuleGroup startDate="2021-11-01">
    <BillingRule name="List Price of CloudFront HTTPS usage in US region" includeDataTransfer="true">
      <BasicBillingRule billingAdjustment="0.000001" billingRuleType="fixedRate" />
      <Product productName="CloudFront">
        <UsageType name="US-Requests-Tier2-HTTPS" />
        <UsageType name="CA-Requests-Tier2-HTTPS" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2021-11-01">
    <BillingRule name="List Price of CloudFront HTTP usage in US region" includeDataTransfer="true">
      <BasicBillingRule billingAdjustment="0.00000075" billingRuleType="fixedRate" />
      <Product productName="CloudFront">
        <UsageType name="US-Requests-Tier1" />
        <UsageType name="CA-Requests-Tier1" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2021-11-01">
    <BillingRule name="List Price of CloudFront HTTPS usage in EU, ME, JP, IN, ZA, and AP regions" includeDataTransfer="true">
      <BasicBillingRule billingAdjustment="0.0000012" billingRuleType="fixedRate" />
      <Product productName="CloudFront">
        <UsageType name="EU-Requests-Tier2-HTTPS" />
        <UsageType name="ME-Requests-Tier2-HTTPS" />
        <UsageType name="JP-Requests-Tier2-HTTPS" />
        <UsageType name="IN-Requests-Tier2-HTTPS" />
        <UsageType name="ZA-Requests-Tier2-HTTPS" />
        <UsageType name="AP-Requests-Tier2-HTTPS" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2021-11-01">
    <BillingRule name="List Price of CloudFront HTTP usage in EU, ME, JP, IN, ZA, and AP regions" includeDataTransfer="true">
      <BasicBillingRule billingAdjustment="0.0000009" billingRuleType="fixedRate" />
      <Product productName="CloudFront">
        <UsageType name="EU-Requests-Tier1" />
        <UsageType name="ME-Requests-Tier1" />
        <UsageType name="JP-Requests-Tier1" />
        <UsageType name="IN-Requests-Tier1" />
        <UsageType name="ZA-Requests-Tier1" />
        <UsageType name="AP-Requests-Tier1" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2021-11-01">
    <BillingRule name="List Price of CloudFront HTTPS usage in Australia region" includeDataTransfer="true">
      <BasicBillingRule billingAdjustment="0.00000125" billingRuleType="fixedRate" />
      <Product productName="CloudFront">
        <UsageType name="AU-Requests-Tier2-HTTPS" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2021-11-01">
    <BillingRule name="List Price of CloudFront HTTP usage in Australia region" includeDataTransfer="true">
      <BasicBillingRule billingAdjustment="0.0000009" billingRuleType="fixedRate" />
      <Product productName="CloudFront">
        <UsageType name="AU-Requests-Tier1" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2021-11-01">
    <BillingRule name="List Price of CloudFront HTTPS usage in South America region" includeDataTransfer="true">
      <BasicBillingRule billingAdjustment="0.0000022" billingRuleType="fixedRate" />
      <Product productName="CloudFront">
        <UsageType name="SA-Requests-Tier2-HTTPS" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2021-11-01">
    <BillingRule name="List Price of CloudFront HTTP usage in South America region" includeDataTransfer="true">
      <BasicBillingRule billingAdjustment="0.0000016" billingRuleType="fixedRate" />
      <Product productName="CloudFront">
        <UsageType name="SA-Requests-Tier1" />
      </Product>
    </BillingRule>
  </RuleGroup>
</CHTBillingRules>`
    },
    {
        id: '__builtin_s3_custom_pricing__',
        name: 'S3 Custom Tier Pricing',
        description: 'Updates Amazon S3 storage rates across specific regions based on negotiated pricing for tiers including Standard, Infrequent Access, and Intelligent-Tiering.',
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<CHTBillingRules createdBy="CloudHealth" date="2026-03-26">
  <Comment>Updates S3 storage rates across regions based on negotiated pricing for specific storage tiers including Standard, Infrequent Access, and Intelligent-Tiering.</Comment>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Standard-Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0108" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="ap-east-1" />
        <Region name="ap-northeast-1" />
        <Region name="ap-northeast-2" />
        <Region name="ap-northeast-3" />
        <Region name="ap-south-1" />
        <Region name="ap-south-2" />
        <Region name="ap-southeast-1" />
        <Region name="ap-southeast-2" />
        <Region name="ap-southeast-3" />
        <Region name="ap-southeast-4" />
        <Region name="ca-central-1" />
        <Region name="me-central-1" />
        <UsageType name="*TimedStorage-SIA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Frequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0179" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="ap-east-1" />
        <Region name="ap-northeast-1" />
        <Region name="ap-northeast-2" />
        <Region name="ap-northeast-3" />
        <Region name="ap-south-1" />
        <Region name="ap-south-2" />
        <Region name="ap-southeast-1" />
        <Region name="ap-southeast-2" />
        <Region name="ap-southeast-3" />
        <Region name="ap-southeast-4" />
        <Region name="ca-central-1" />
        <Region name="me-central-1" />
        <UsageType name="*TimedStorage-INT-FA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0108" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="ap-east-1" />
        <Region name="ap-northeast-1" />
        <Region name="ap-northeast-2" />
        <Region name="ap-northeast-3" />
        <Region name="ap-south-1" />
        <Region name="ap-south-2" />
        <Region name="ap-southeast-1" />
        <Region name="ap-southeast-2" />
        <Region name="ap-southeast-3" />
        <Region name="ap-southeast-4" />
        <Region name="ca-central-1" />
        <Region name="me-central-1" />
        <UsageType name="*TimedStorage-INT-IA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Archive Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.00351" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="ap-northeast-1" />
        <Region name="ap-south-1" />
        <Region name="ap-south-2" />
        <Region name="ap-southeast-2" />
        <Region name="ap-southeast-3" />
        <Region name="ap-southeast-4" />
        <Region name="eu-west-1" />
        <UsageType name="*TimedStorage-INT-AA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Glacier Flexible Retrieval Storage Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.00351" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="ap-northeast-1" />
        <Region name="ap-south-1" />
        <Region name="ap-south-2" />
        <Region name="ap-southeast-2" />
        <Region name="ap-southeast-3" />
        <Region name="ap-southeast-4" />
        <Region name="eu-west-1" />
        <UsageType name="*TimedStorage-GlacierByteHrs" />
      </Product>
    </BillingRule>
    <BillingRule name="S3 Standard Storage Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0164" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-north-1" />
        <Region name="eu-south-2" />
        <Region name="eu-west-1" />
        <Region name="us-east-1" />
        <Region name="us-east-2" />
        <Region name="us-west-2" />
        <UsageType name="*TimedStorage-ByteHrs" />
      </Product>
    </BillingRule>
    <BillingRule name="S3 Standard-Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0098" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-north-1" />
        <Region name="eu-south-2" />
        <Region name="eu-west-1" />
        <Region name="us-east-1" />
        <Region name="us-east-2" />
        <Region name="us-west-2" />
        <UsageType name="*TimedStorage-SIA-ByteHrs" />
      </Product>
    </BillingRule>
    <BillingRule name="S3 One Zone-Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0078" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-north-1" />
        <Region name="eu-south-2" />
        <Region name="eu-west-1" />
        <Region name="us-east-1" />
        <Region name="us-east-2" />
        <Region name="us-west-2" />
        <UsageType name="*TimedStorage-ZIA-ByteHrs" />
      </Product>
    </BillingRule>
    <BillingRule name="S3 Intelligent-Tiering Frequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0164" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-north-1" />
        <Region name="eu-south-2" />
        <Region name="eu-west-1" />
        <Region name="us-east-1" />
        <Region name="us-east-2" />
        <Region name="us-west-2" />
        <UsageType name="*TimedStorage-INT-FA-ByteHrs" />
      </Product>
    </BillingRule>
    <BillingRule name="S3 Intelligent-Tiering Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0098" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-north-1" />
        <Region name="eu-south-2" />
        <Region name="eu-west-1" />
        <Region name="us-east-1" />
        <Region name="us-east-2" />
        <Region name="us-west-2" />
        <UsageType name="*TimedStorage-INT-IA-ByteHrs" />
      </Product>
    </BillingRule>
    <BillingRule name="S3 Intelligent-Tiering Archive Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.00281" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-north-1" />
        <Region name="eu-west-1" />
        <Region name="us-east-1" />
        <Region name="us-east-2" />
        <Region name="us-west-2" />
        <UsageType name="*TimedStorage-INT-AA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Standard Storage Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0164" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-north-1" />
        <Region name="eu-south-2" />
        <Region name="eu-west-1" />
        <Region name="us-east-1" />
        <Region name="us-east-2" />
        <Region name="us-west-2" />
        <UsageType name="*TimedStorage-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Standard-Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0098" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-north-1" />
        <Region name="eu-south-2" />
        <Region name="eu-west-1" />
        <Region name="us-east-1" />
        <Region name="us-east-2" />
        <Region name="us-west-2" />
        <UsageType name="*TimedStorage-SIA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 One Zone-Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0078" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-north-1" />
        <Region name="eu-south-2" />
        <Region name="eu-west-1" />
        <Region name="us-east-1" />
        <Region name="us-east-2" />
        <Region name="us-west-2" />
        <UsageType name="*TimedStorage-ZIA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Frequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0164" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-north-1" />
        <Region name="eu-south-2" />
        <Region name="eu-west-1" />
        <Region name="us-east-1" />
        <Region name="us-east-2" />
        <Region name="us-west-2" />
        <UsageType name="*TimedStorage-INT-FA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0098" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-north-1" />
        <Region name="eu-south-2" />
        <Region name="eu-west-1" />
        <Region name="us-east-1" />
        <Region name="us-east-2" />
        <Region name="us-west-2" />
        <UsageType name="*TimedStorage-INT-IA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Archive Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.00281" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-north-1" />
        <Region name="eu-west-1" />
        <Region name="us-east-1" />
        <Region name="us-east-2" />
        <Region name="us-west-2" />
        <UsageType name="*TimedStorage-INT-AA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Glacier Flexible Retrieval Storage Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.00281" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-north-1" />
        <Region name="eu-west-1" />
        <Region name="us-east-1" />
        <Region name="us-east-2" />
        <Region name="us-west-2" />
        <UsageType name="*TimedStorage-GlacierByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Standard Storage Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0172" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-south-1" />
        <Region name="eu-west-2" />
        <Region name="eu-west-3" />
        <UsageType name="*TimedStorage-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Standard-Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0112" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="us-west-1" />
        <UsageType name="*TimedStorage-SIA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Standard Storage Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0187" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="us-west-1" />
        <UsageType name="*TimedStorage-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 One Zone-Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.009" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="us-west-1" />
        <UsageType name="*TimedStorage-ZIA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Frequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0187" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="us-west-1" />
        <UsageType name="*TimedStorage-INT-FA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0112" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="us-west-1" />
        <UsageType name="*TimedStorage-INT-IA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Standard-Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0102" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-west-2" />
        <Region name="eu-west-3" />
        <Region name="eu-south-1" />
        <UsageType name="*TimedStorage-SIA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Standard Storage Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0176" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-central-1" />
        <UsageType name="*TimedStorage-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Standard-Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0105" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-central-1" />
        <UsageType name="*TimedStorage-SIA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Frequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0176" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-central-1" />
        <UsageType name="*TimedStorage-INT-FA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0105" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-central-1" />
        <UsageType name="*TimedStorage-INT-IA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Standard Storage Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0193" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-central-2" />
        <UsageType name="*TimedStorage-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Standard-Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0116" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-central-2" />
        <Region name="af-south-1" />
        <UsageType name="*TimedStorage-SIA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Frequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0193" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-central-2" />
        <UsageType name="*TimedStorage-INT-FA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 One Zone-Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0093" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-central-2" />
        <UsageType name="*TimedStorage-ZIA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0116" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="af-south-1" />
        <Region name="eu-central-2" />
        <UsageType name="*TimedStorage-INT-IA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Standard Storage Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0289" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="sa-east-1" />
        <UsageType name="*TimedStorage-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Standard-Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0172" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="sa-east-1" />
        <UsageType name="*TimedStorage-SIA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 One Zone-Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0138" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="sa-east-1" />
        <UsageType name="*TimedStorage-ZIA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Frequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0289" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="sa-east-1" />
        <UsageType name="*TimedStorage-INT-FA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0172" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="sa-east-1" />
        <UsageType name="*TimedStorage-INT-IA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 One Zone-Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0086" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="ap-south-1" />
        <Region name="ap-southeast-1" />
        <Region name="ap-southeast-2" />
        <Region name="ap-southeast-3" />
        <Region name="me-central-1" />
        <UsageType name="*TimedStorage-ZIA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Frequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0172" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-south-1" />
        <Region name="eu-west-2" />
        <Region name="eu-west-3" />
        <UsageType name="*TimedStorage-INT-FA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Infrequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0102" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="eu-south-1" />
        <Region name="eu-west-2" />
        <Region name="eu-west-3" />
        <UsageType name="*TimedStorage-INT-IA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Standard Storage Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0195" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="af-south-1" />
        <UsageType name="*TimedStorage-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
  <RuleGroup startDate="2025-05-01">
    <BillingRule name="S3 Intelligent-Tiering Frequent Access Custom Pricing" includeDataTransfer="false">
      <BasicBillingRule billingAdjustment="0.0195" billingRuleType="fixedRate" />
      <Product productName="Amazon Simple Storage Service">
        <Region name="af-south-1" />
        <UsageType name="*TimedStorage-INT-FA-ByteHrs" />
      </Product>
    </BillingRule>
  </RuleGroup>
</CHTBillingRules>`
    }
];
