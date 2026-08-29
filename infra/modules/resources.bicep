targetScope = 'resourceGroup'

param environmentName string
param location string = resourceGroup().location
param tags object = {}

@secure()
param kakaoJavascriptKey string
@secure()
param kakaoRestApiKey string
@secure()
param gongyuNuriApiKey string
param gongyuNuriBaseUrl string
param allowedOrigins string
param destinationHourlyFee string
param rateLimitWindowMs string
param rateLimitMax string
param reportRateLimitMax string

var resourceSuffix = take(uniqueString(subscription().id, environmentName, location), 6)
var serviceName = 'web'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${environmentName}-${resourceSuffix}'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${environmentName}-${resourceSuffix}'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-${resourceSuffix}'
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
  }
}

resource secretKakaoRest 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'kakao-rest-api-key'
  properties: {
    value: empty(kakaoRestApiKey) ? ' ' : kakaoRestApiKey
  }
}

resource secretGongyu 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'gongyu-nuri-api-key'
  properties: {
    value: empty(gongyuNuriApiKey) ? ' ' : gongyuNuriApiKey
  }
}

resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: 'plan-${environmentName}-${resourceSuffix}'
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2022-09-01' = {
  name: 'app-${environmentName}-${resourceSuffix}'
  location: location
  kind: 'app,linux'
  tags: union(tags, { 'azd-service-name': serviceName })
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      alwaysOn: true
      healthCheckPath: '/api/health'
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'true' }
        { name: 'NODE_ENV', value: 'production' }
        { name: 'PORT', value: '8080' }
        { name: 'WEBSITES_PORT', value: '8080' }
        { name: 'DESTINATION_HOURLY_FEE', value: destinationHourlyFee }
        { name: 'ALLOWED_ORIGINS', value: allowedOrigins }
        { name: 'RATE_LIMIT_WINDOW_MS', value: rateLimitWindowMs }
        { name: 'RATE_LIMIT_MAX', value: rateLimitMax }
        { name: 'REPORT_RATE_LIMIT_MAX', value: reportRateLimitMax }
        { name: 'KAKAO_JAVASCRIPT_KEY', value: kakaoJavascriptKey }
        { name: 'GONGYU_NURI_BASE_URL', value: gongyuNuriBaseUrl }
        { name: 'KAKAO_REST_API_KEY', value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=${secretKakaoRest.name})' }
        { name: 'GONGYU_NURI_API_KEY', value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=${secretGongyu.name})' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        { name: 'ApplicationInsightsAgent_EXTENSION_VERSION', value: '~3' }
      ]
    }
  }
}

resource keyVaultSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, webApp.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'diag-webapp'
  scope: webApp
  properties: {
    workspaceId: logAnalytics.id
    logs: [
      { categoryGroup: 'allLogs', enabled: true }
    ]
    metrics: [
      { category: 'AllMetrics', enabled: true }
    ]
  }
}

output keyVaultName string = keyVault.name
output logAnalyticsWorkspaceId string = logAnalytics.id
output webUrl string = 'https://${webApp.properties.defaultHostName}'
