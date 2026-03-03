import React from 'react';
import {
    FaAws, FaServer, FaDatabase, FaBox, FaCloud, FaNetworkWired, FaCube, FaCubes, FaSitemap,
    FaMicrochip, FaLock, FaShieldAlt, FaTerminal, FaCode, FaChartLine, FaChartBar, FaSearch,
    FaTasks, FaEnvelope, FaBell, FaDesktop, FaLink, FaRobot, FaMagic, FaEye, FaInfinity,
    FaFileInvoiceDollar, FaHeadset, FaTools, FaFileAlt
} from 'react-icons/fa';
import * as AWSIconSet from 'aws-react-icons';
import { productIconMapping } from './awsIconMapping';

// Base colors for AWS categories
const CATEGORY_COLORS = {
    compute: '#FF9900',
    storage: '#569A31',
    database: '#3B48CC',
    network: '#8C4FFF',
    messaging: '#FF4F8B',
    security: '#FF4F8B',
    analytics: '#2D72C8',
    ml: '#2D72C8',
    dev: '#3B48CC',
    mgmt: '#475569',
    default: '#FF9900'
};

export const getIconForProduct = (productName) => {
    if (!productName || productName === '(All Products)' || productName === '(No Product Selected)') {
        return <FaAws size={24} color={CATEGORY_COLORS.default} />;
    }

    // 1. Try exact mapping from aws-react-icons
    const iconName = productIconMapping[productName];
    if (iconName && AWSIconSet[iconName]) {
        const IconComponent = AWSIconSet[iconName];
        return <IconComponent size={24} />;
    }

    // 2. Fallback to heuristic matching with react-icons
    const lower = productName.toLowerCase();

    if (lower.includes('ec2') || lower.includes('compute') || lower.includes('fargate'))
        return <AWSIconSet.ArchitectureServiceAmazonEC2 size={24} />;

    if (lower.includes('s3') || lower.includes('storage') || lower.includes('glacier') || lower.includes('efs') || lower.includes('fsx'))
        return <AWSIconSet.ArchitectureServiceAmazonSimpleStorageService size={24} />;

    if (lower.includes('rds') || lower.includes('relational') || lower.includes('database') || lower.includes('aurora'))
        return <AWSIconSet.ArchitectureServiceAmazonRDS size={24} />;

    if (lower.includes('lambda') || lower.includes('serverless'))
        return <AWSIconSet.ArchitectureServiceAWSLambda size={24} />;

    if (lower.includes('dynamo'))
        return <AWSIconSet.ArchitectureServiceAmazonDynamoDB size={24} />;

    if (lower.includes('vpc') || lower.includes('network') || lower.includes('direct connect') || lower.includes('privatelink'))
        return <AWSIconSet.ArchitectureServiceAmazonVirtualPrivateCloud size={24} />;

    if (lower.includes('route 53') || lower.includes('route53') || lower.includes('dns'))
        return <AWSIconSet.ArchitectureServiceAmazonRoute53 size={24} />;

    if (lower.includes('queue') || lower.includes('sqs'))
        return <AWSIconSet.ArchitectureServiceAmazonSimpleQueueService size={24} />;

    if (lower.includes('sns') || lower.includes('notification'))
        return <AWSIconSet.ArchitectureServiceAmazonSimpleNotificationService size={24} />;

    if (lower.includes('elasticache') || lower.includes('cache'))
        return <AWSIconSet.ArchitectureServiceAmazonElastiCache size={24} />;

    if (lower.includes('redshift') || lower.includes('warehouse'))
        return <AWSIconSet.ArchitectureServiceAmazonRedshift size={24} />;

    if (lower.includes('cloudwatch') || lower.includes('monitor'))
        return <AWSIconSet.ArchitectureServiceAmazonCloudWatch size={24} />;

    // Category fallbacks using Fa icons
    if (lower.includes('iam') || lower.includes('identity') || lower.includes('cognito') || lower.includes('shield') || lower.includes('waf') || lower.includes('security'))
        return <FaShieldAlt size={24} color={CATEGORY_COLORS.security} />;

    if (lower.includes('kms') || lower.includes('secret') || lower.includes('encrypt'))
        return <FaLock size={24} color={CATEGORY_COLORS.security} />;

    if (lower.includes('code') || lower.includes('build') || lower.includes('pipeline') || lower.includes('deploy'))
        return <FaCode size={24} color={CATEGORY_COLORS.dev} />;

    if (lower.includes('athena') || lower.includes('glue') || lower.includes('quicksight') || lower.includes('emr') || lower.includes('analytics'))
        return <FaChartBar size={24} color={CATEGORY_COLORS.analytics} />;

    if (lower.includes('sage') || lower.includes('bedrock') || lower.includes('personalize') || lower.includes('machine learning'))
        return <FaRobot size={24} color={CATEGORY_COLORS.ml} />;

    if (lower.includes('iot'))
        return <FaMicrochip size={24} color={CATEGORY_COLORS.dev} />;

    if (lower.includes('step functions') || lower.includes('workflow'))
        return <FaTasks size={24} color={CATEGORY_COLORS.security} />;

    if (lower.includes('billing') || lower.includes('cost') || lower.includes('budget'))
        return <FaFileInvoiceDollar size={24} color={CATEGORY_COLORS.storage} />;

    if (lower.includes('support'))
        return <FaHeadset size={24} color={CATEGORY_COLORS.storage} />;

    if (lower.includes('workspaces') || lower.includes('appstream'))
        return <FaDesktop size={24} color={CATEGORY_COLORS.security} />;

    if (lower.includes('backup'))
        return <FaDatabase size={24} color={CATEGORY_COLORS.storage} />;

    if (lower.includes('cloudformation'))
        return <FaCubes size={24} color={CATEGORY_COLORS.default} />;

    if (lower.includes('systems manager'))
        return <FaTools size={24} color={CATEGORY_COLORS.mgmt} />;

    return <FaAws size={24} color={CATEGORY_COLORS.default} />;
};
