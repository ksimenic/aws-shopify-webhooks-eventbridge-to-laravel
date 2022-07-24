const AWS = require('aws-sdk');
AWS.config.update({region: 'eu-west-2'});
const sqs = new AWS.SQS();

const destinationQueueUrl = "https://sqs.eu-west-2.amazonaws.com/XXXXXXXXXXXX/webhooks-laravel";
const jobName = "App\\Jobs\\HandleShopifyWebhook";

exports.handler = async (event, context, callback) => {

    await Promise.all(event.Records.map(async (record) => {

        const { body, eventSourceARN } = record;

        const data = JSON.parse(body);

        const shop_domain = data.detail.metadata['X-Shopify-Shop-Domain'];
        const webhook_topic = data.detail.metadata['X-Shopify-Topic'];
        const detail_buffer = Buffer.from(JSON.stringify(data.detail), 'utf-8');
        var full_details = detail_buffer.toString('base64');

        const job_details = {
            displayName: jobName,
            job: "Illuminate\\Queue\\CallQueuedHandler@call",
            maxTries: null,
            timeout: null,
            timeoutAt: null,
            data: {
                commandName: jobName,
                command: "O:" + jobName.length + ":\"" + jobName + "\":10:{s:14:\"\u0000*\u0000shop_domain\";s:" + shop_domain.length + ":\"" + shop_domain + "\";s:16:\"\u0000*\u0000webhook_topic\";s:" + webhook_topic.length + ":\"" + webhook_topic + "\";s:15:\"\u0000*\u0000full_details\";s:" + full_details.length + ":\"" + full_details + "\";s:6:\"\u0000*\u0000job\";N;s:10:\"connection\";N;s:5:\"queue\";N;s:15:\"chainConnection\";N;s:10:\"chainQueue\";N;s:5:\"delay\";N;s:7:\"chained\";a:0:{}}"
            }
        };

        var sqsMessageParams = {
            MessageBody: JSON.stringify(job_details),
            QueueUrl: destinationQueueUrl
        };


        await sqs.sendMessage(sqsMessageParams).promise().catch(err => {
            console.log(`Webhook EB | ERROR: ${err}`);
        });

    }));
};