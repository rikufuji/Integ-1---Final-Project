<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="yes" encoding="UTF-8"/>

  <xsl:template match="/">
    <html>
      <head>
        <title>BoardEase - Payment History</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background: #f0f4ff; margin: 0; padding: 20px; }
          h2 { color: #3b4fa8; text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
          th { background: #3b4fa8; color: #fff; padding: 12px 16px; text-align: left; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 12px 16px; border-bottom: 1px solid #e8ecf8; font-size: 14px; color: #333; }
          tr:last-child td { border-bottom: none; }
          tr:hover td { background: #f5f7ff; }
          .approved { color: #22c55e; font-weight: 700; text-transform: uppercase; }
          .denied { color: #ef4444; font-weight: 700; text-transform: uppercase; }
          .pending { color: #f59e0b; font-weight: 700; text-transform: uppercase; }
          .amount { font-weight: 700; color: #3b4fa8; }
        </style>
      </head>
      <body>
        <h2>BoardEase — Payment History</h2>
        <table>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Room</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="payments/payment">
              <xsl:sort select="date" order="descending"/>
              <tr>
                <td><xsl:value-of select="tenantName"/></td>
                <td><xsl:value-of select="roomNumber"/></td>
                <td><xsl:value-of select="date"/></td>
                <td class="amount">&#8369; <xsl:value-of select="format-number(amount, '#,##0')"/></td>
                <td><xsl:value-of select="method"/></td>
                <td>
                  <xsl:attribute name="class">
                    <xsl:value-of select="status"/>
                  </xsl:attribute>
                  <xsl:value-of select="status"/>
                </td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
