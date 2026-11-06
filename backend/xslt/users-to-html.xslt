<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="yes" encoding="UTF-8"/>

  <xsl:template match="/">
    <html>
      <head>
        <title>BoardEase - Tenant Directory</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background: #f0f4ff; margin: 0; padding: 20px; }
          h2 { color: #3b4fa8; text-align: center; margin-bottom: 20px; }
          .card { background: #fff; border-radius: 12px; padding: 16px 20px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); display: flex; gap: 20px; align-items: flex-start; }
          .card-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
          .card-value { font-size: 14px; color: #222; font-weight: 600; margin-top: 2px; }
          .field { min-width: 140px; }
          .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
          .tenant { background: #e0e7ff; color: #3b4fa8; }
          .admin { background: #fef3c7; color: #b45309; }
        </style>
      </head>
      <body>
        <h2>BoardEase — Tenant Directory</h2>
        <xsl:for-each select="users/user">
          <xsl:if test="role = 'tenant'">
            <div class="card">
              <div class="field">
                <div class="card-label">Full Name</div>
                <div class="card-value"><xsl:value-of select="fullName"/></div>
              </div>
              <div class="field">
                <div class="card-label">Room</div>
                <div class="card-value"><xsl:value-of select="roomNumber"/></div>
              </div>
              <div class="field">
                <div class="card-label">Account No.</div>
                <div class="card-value"><xsl:value-of select="accountNumber"/></div>
              </div>
              <div class="field">
                <div class="card-label">Monthly Rent</div>
                <div class="card-value">&#8369; <xsl:value-of select="monthlyRent"/></div>
              </div>
              <div class="field">
                <div class="card-label">Phone</div>
                <div class="card-value"><xsl:value-of select="phone"/></div>
              </div>
              <div class="field">
                <div class="card-label">Role</div>
                <div class="card-value">
                  <span class="badge tenant"><xsl:value-of select="role"/></span>
                </div>
              </div>
            </div>
          </xsl:if>
        </xsl:for-each>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
