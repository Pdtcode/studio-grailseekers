import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'arbp7h2s',
    dataset: 'production'
  },
  /**
   * Disable auto-updates for studios to prevent interactive prompts during CI builds
   * Learn more at https://www.sanity.io/docs/cli#auto-updates
   */
  deployment: {
    autoUpdates: false
  },
})
