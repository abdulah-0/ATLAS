export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const notificationService = {
  /**
   * Triggers a push notification alert for key trading system events
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    console.log(`🔔 [PUSH NOTIFICATION] ${payload.title}: ${payload.body}`);
    // In production, expo-notifications triggers the native Android/iOS system banner
  },

  async notifyBotKilled(botId: string, nickname: string, reasons: string[]): Promise<void> {
    await this.sendNotification({
      title: `💀 Bot Terminated: ${botId}`,
      body: `${nickname} was eliminated. Reason: ${reasons.join('; ')}. Replacement bot generation queued.`,
      data: { botId, reasons },
    });
  },

  async notifyMilestoneAchieved(btcAmount: number): Promise<void> {
    await this.sendNotification({
      title: `🚀 20 BTC Milestone Achieved!`,
      body: `Congratulations! Total accumulation has reached ${btcAmount.toFixed(4)} BTC.`,
      data: { btcAmount },
    });
  },

  async notifyRiskAlert(ruleName: string, details: string): Promise<void> {
    await this.sendNotification({
      title: `⚠️ Risk Engine Alert: ${ruleName}`,
      body: details,
      data: { ruleName, details },
    });
  },

  async notifyBreakingNews(headline: string, asset: string): Promise<void> {
    await this.sendNotification({
      title: `🚨 Breaking News Interrupt [${asset}]`,
      body: headline,
      data: { headline, asset },
    });
  }
};
