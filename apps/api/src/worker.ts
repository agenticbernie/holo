import type { DatasetQueueMessage } from "@pipa/application";
import { createProductionDependencies } from "./composition";
import { createHttpApp } from "./http";

const fetchHandler = (
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
): Response | Promise<Response> => {
  const dependencies = createProductionDependencies(env);
  const app = createHttpApp(dependencies, env.ENVIRONMENT);
  return app.fetch(request, env, executionContext);
};

const queueHandler = async (batch: MessageBatch<DatasetQueueMessage>, env: Env): Promise<void> => {
  const dependencies = createProductionDependencies(env);
  for (const message of batch.messages) {
    try {
      await dependencies.datasets.process(message.body);
      message.ack();
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "dataset_job_failed",
          jobId: message.body.jobId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      message.retry({ delaySeconds: 30 });
    }
  }
};

export default {
  fetch: fetchHandler,
  queue: queueHandler,
};
