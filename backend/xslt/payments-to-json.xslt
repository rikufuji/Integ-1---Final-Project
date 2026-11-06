<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="text" encoding="UTF-8"/>

  <xsl:template match="/">
    <xsl:text>{"payments":[</xsl:text>
    <xsl:for-each select="payments/payment">
      <xsl:text>{</xsl:text>
      <xsl:text>"id":"</xsl:text><xsl:value-of select="id"/><xsl:text>",</xsl:text>
      <xsl:text>"tenantId":"</xsl:text><xsl:value-of select="tenantId"/><xsl:text>",</xsl:text>
      <xsl:text>"tenantName":"</xsl:text><xsl:value-of select="tenantName"/><xsl:text>",</xsl:text>
      <xsl:text>"roomNumber":"</xsl:text><xsl:value-of select="roomNumber"/><xsl:text>",</xsl:text>
      <xsl:text>"amount":</xsl:text><xsl:value-of select="amount"/><xsl:text>,</xsl:text>
      <xsl:text>"date":"</xsl:text><xsl:value-of select="date"/><xsl:text>",</xsl:text>
      <xsl:text>"method":"</xsl:text><xsl:value-of select="method"/><xsl:text>",</xsl:text>
      <xsl:text>"status":"</xsl:text><xsl:value-of select="status"/><xsl:text>",</xsl:text>
      <xsl:text>"message":"</xsl:text><xsl:value-of select="message"/><xsl:text>",</xsl:text>
      <xsl:text>"denialReason":"</xsl:text><xsl:value-of select="denialReason"/><xsl:text>",</xsl:text>
      <xsl:text>"createdAt":"</xsl:text><xsl:value-of select="createdAt"/><xsl:text>"</xsl:text>
      <xsl:text>}</xsl:text>
      <xsl:if test="position() != last()"><xsl:text>,</xsl:text></xsl:if>
    </xsl:for-each>
    <xsl:text>]}</xsl:text>
  </xsl:template>
</xsl:stylesheet>
