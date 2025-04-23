import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport, } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import pg from "pg";

const { Client } = pg;

// PostgreSQL connection setup
const dbClient = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
});

dbClient.connect();
// Create server instance
const server = new McpServer({
    name: "crm",
    version: "1.0.0",
});



server.tool("getOpportunities", "Get a list of active opportunities from the CRM system", {
}, async () => {
    console.log('Looking up opportunities');
    try {
        const query = `
            SELECT 
                opportunities.id AS opportunity_id,
                opportunities.status,
                opportunities.account_id,
                accounts.name AS account_name,
                opportunity_items.id AS item_id,
                opportunity_items.description,
                opportunity_items.amount,
                opportunity_items.year
            FROM 
                opportunities
            LEFT JOIN 
                opportunity_items 
                ON opportunities.id = opportunity_items.opportunityid
            LEFT JOIN
                accounts
                ON opportunities.account_id = accounts.id
            WHERE 
                opportunities.status = 'active';

        `;
        const result = await dbClient.query(query);

        if (result.rows.length === 0) {
            return {
                content: [
                    { type: "text", text: `No active opportunities found.` },
                ],
            };
        }

        const opportunityText = `Active Opportunities: ` + JSON.stringify(result.rows[0], null, 2);
        return {
            content: [
                { type: "text", text: opportunityText },
            ],
        };
    } catch (error) {
        console.log(error);
        return {
            content: [
                { type: "text", text: `Error fetching opportunities: ${error.message}` },
            ],
        };
    }
});


server.tool("getSupportCases", "Get a list of support cases", {}, async () => {
    console.log(`Looking up support cases for account id 1`);
    try {
        const query = `
            SELECT 
                support_cases.id AS case_id,
                support_cases.subject,
                support_cases.description,
                support_cases.status,
                support_cases.severity,
                support_cases.created_at,
                accounts.name AS account_name
            FROM 
                support_cases
            LEFT JOIN 
                accounts 
                ON support_cases.account_id = accounts.id
            WHERE 
                support_cases.account_id = '1'
            ORDER BY 
                support_cases.created_at DESC;
        `;

        const result = await dbClient.query(query);

        if (result.rows.length === 0) {
            return {
                content: [
                    { type: "text", text: `No support cases found for account 1.` },
                ],
            };
        }

        const caseText = `Support Cases for account i:` + JSON.stringify(result.rows, null, 2);
        return {
            content: [
                { type: "text", text: caseText },
            ],
        };
    } catch (error) {
        console.log(error);
        return {
            content: [
                { type: "text", text: `Error fetching support cases: ${error.message}` },
            ],
        };
    }
});


async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("CRM MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
