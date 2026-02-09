#[allow(lint(self_transfer))]
module mana_pool::mana_pool;

use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::balance::{Self, Balance};
use sui::event;

// === Errors ===
const EJobNotOpen: u64 = 0;
const EJobNotClaimed: u64 = 1;
const ENotWorker: u64 = 2;

// === Status constants ===
const STATUS_OPEN: u8 = 0;
const STATUS_CLAIMED: u8 = 1;
const STATUS_COMPLETED: u8 = 2;

// === Objects ===

public struct Job has key, store {
    id: UID,
    poster: address,
    description: vector<u8>,
    blob_id: vector<u8>,
    bounty: Balance<SUI>,
    status: u8,
    worker: Option<address>,
    solution_blob_id: Option<vector<u8>>,
    is_urgent: bool,
}

// === Events ===

public struct JobPosted has copy, drop {
    job_id: ID,
    poster: address,
    description: vector<u8>,
    blob_id: vector<u8>,
    bounty_amount: u64,
    is_urgent: bool,
}

public struct JobClaimed has copy, drop {
    job_id: ID,
    worker: address,
}

public struct SolutionSubmitted has copy, drop {
    job_id: ID,
    worker: address,
    solution_blob_id: vector<u8>,
}

// === Public Functions ===

/// Post a new job with escrowed bounty. The Job becomes a shared object.
public fun post_job(
    description: vector<u8>,
    blob_id: vector<u8>,
    is_urgent: bool,
    payment: Coin<SUI>,
    ctx: &mut TxContext,
) {
    let bounty_amount = coin::value(&payment);
    let job = Job {
        id: object::new(ctx),
        poster: ctx.sender(),
        description,
        blob_id,
        bounty: coin::into_balance(payment),
        status: STATUS_OPEN,
        worker: option::none(),
        solution_blob_id: option::none(),
        is_urgent,
    };

    event::emit(JobPosted {
        job_id: object::id(&job),
        poster: ctx.sender(),
        description,
        blob_id,
        bounty_amount,
        is_urgent,
    });

    transfer::share_object(job);
}

/// Claim an open job. Sets the caller as the worker.
public fun claim_job(
    job: &mut Job,
    ctx: &mut TxContext,
) {
    assert!(job.status == STATUS_OPEN, EJobNotOpen);

    job.status = STATUS_CLAIMED;
    job.worker = option::some(ctx.sender());

    event::emit(JobClaimed {
        job_id: object::id(job),
        worker: ctx.sender(),
    });
}

/// Submit a solution and receive the bounty instantly.
public fun submit_solution(
    job: &mut Job,
    solution_blob_id: vector<u8>,
    ctx: &mut TxContext,
) {
    assert!(job.status == STATUS_CLAIMED, EJobNotClaimed);
    assert!(option::contains(&job.worker, &ctx.sender()), ENotWorker);

    job.status = STATUS_COMPLETED;
    job.solution_blob_id = option::some(solution_blob_id);

    // Pay worker the full bounty
    let bounty_value = balance::value(&job.bounty);
    let payment = coin::from_balance(balance::split(&mut job.bounty, bounty_value), ctx);
    transfer::public_transfer(payment, ctx.sender());

    event::emit(SolutionSubmitted {
        job_id: object::id(job),
        worker: ctx.sender(),
        solution_blob_id,
    });
}
