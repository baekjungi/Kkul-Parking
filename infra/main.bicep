targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the azd environment')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@secure()
@description('Kakao JavaScript SDK key (public, used by the browser)')
param kakaoJavascriptKey string = ''

@secure()
@description('Kakao REST API key (server-side proxy calls)')
param kakaoRestApiKey string = ''

@secure()
@description('Gongyu-Nuri (공유누리) API key')
param gongyuNuriApiKey string = ''

@description('Gongyu-Nuri (공유누리) API base URL')
param gongyuNuriBaseUrl string = 'https://www.eshare.go.kr'

@description('Comma separated list of allowed CORS origins for production')
param allowedOrigins string = ''

@description('Destination hourly parking fee used for savings comparison')
param destinationHourlyFee string = '7500'

@description('Rate limit window in milliseconds')
param rateLimitWindowMs string = '60000'

@description('Max requests per window per client for general API routes')
param rateLimitMax string = '180'

@description('Max requests per window per client for report submissions')
param reportRateLimitMax string = '20'

var tags = {
  'azd-env-name': environmentName
}

resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-${environmentName}'
  location: location
  tags: tags
}

module resources './modules/resources.bicep' = {
  name: 'resources'
  scope: rg
  params: {
    environmentName: environmentName
    location: location
    tags: tags
    kakaoJavascriptKey: kakaoJavascriptKey
    kakaoRestApiKey: kakaoRestApiKey
    gongyuNuriApiKey: gongyuNuriApiKey
    gongyuNuriBaseUrl: gongyuNuriBaseUrl
    allowedOrigins: allowedOrigins
    destinationHourlyFee: destinationHourlyFee
    rateLimitWindowMs: rateLimitWindowMs
    rateLimitMax: rateLimitMax
    reportRateLimitMax: reportRateLimitMax
  }
}

output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_KEY_VAULT_NAME string = resources.outputs.keyVaultName
output AZURE_LOG_ANALYTICS_WORKSPACE_ID string = resources.outputs.logAnalyticsWorkspaceId
output WEB_URL string = resources.outputs.webUrl
output SERVICE_WEB_ENDPOINT_URL string = resources.outputs.webUrl
