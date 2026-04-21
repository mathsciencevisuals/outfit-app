import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Job } from "bullmq";

import { TRYON_QUEUE } from "../queues/tryon.queue";
import { TryOnService } from "../../modules/tryon/tryon.module";

@Injectable()
@Processor(TRYON_QUEUE)
export class TryOnWorker extends WorkerHost {
  constructor(private readonly tryOnService: TryOnService) {
    super();
  }

  async process(job: Job<{ tryOnRequestId: string }>) {
    await this.tryOnService.processQueuedRequest(job.data.tryOnRequestId);
  }
}
