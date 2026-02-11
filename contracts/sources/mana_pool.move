#[allow(lint(self_transfer), unused_const)]
module mana_pool::mana_pool;

use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::balance::{Self, Balance};
use sui::event;
use sui::clock::Clock;
use sui::dynamic_field;

// === Errors ===
const EJobNotOpen: u64 = 0;
const ENotPoster: u64 = 1;
const EDeadlinePassed: u64 = 2;
const EAlreadyProposed: u64 = 3;
const EInvalidWinner: u64 = 4;
const EMaxProposalsReached: u64 = 5;

// === Status constants ===
const STATUS_OPEN: u8 = 0;
const STATUS_COMPLETED: u8 = 1;
const STATUS_REFUNDED: u8 = 2;

// === Tag constants ===
const TAG_URGENT: u8 = 0;
const TAG_CHILL: u8 = 1;

// === Category constants ===
const CATEGORY_CAPTCHA: u8 = 0;
const CATEGORY_CRYPTO: u8 = 1;
const CATEGORY_DESIGN: u8 = 2;
const CATEGORY_DATA: u8 = 3;
const CATEGORY_GENERAL: u8 = 4;

// === Selection mode constants ===
const MODE_FIRST_ANSWER: u8 = 0;
const MODE_FIRST_N: u8 = 1;
const MODE_BEST_ANSWER: u8 = 2;

// === Objects ===

public struct Proposal has store, drop {
    proposer: address,
    solution_blob_id: vector<u8>,
}

public struct Job has key, store {
    id: UID,
    poster: address,
    description: vector<u8>,
    blob_id: vector<u8>,
    bounty: Balance<SUI>,
    status: u8,
    tag: u8,
    category: u8,
    deadline: u64,
    selection_mode: u8,
    max_proposals: u64,
    proposals: vector<Proposal>,
    winner: Option<address>,
    winning_solution: Option<vector<u8>>,
}

public struct ReputationBoard has key {
    id: UID,
}

// === Events ===

public struct JobPosted has copy, drop {
    job_id: ID,
    poster: address,
    description: vector<u8>,
    blob_id: vector<u8>,
    bounty_amount: u64,
    tag: u8,
    category: u8,
    deadline: u64,
    selection_mode: u8,
    max_proposals: u64,
}

public struct ProposalSubmitted has copy, drop {
    job_id: ID,
    proposer: address,
    solution_blob_id: vector<u8>,
}

public struct WinnerSelected has copy, drop {
    job_id: ID,
    winner: address,
    bounty_amount: u64,
}

public struct JobRefunded has copy, drop {
    job_id: ID,
    poster: address,
    bounty_amount: u64,
}

// === Init ===

fun init(ctx: &mut TxContext) {
    let board = ReputationBoard {
        id: object::new(ctx),
    };
    transfer::share_object(board);
}

// === Public Functions ===

/// Post a new job with escrowed bounty.
public fun post_job(
    description: vector<u8>,
    blob_id: vector<u8>,
    tag: u8,
    category: u8,
    deadline: u64,
    selection_mode: u8,
    max_proposals: u64,
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
        tag,
        category,
        deadline,
        selection_mode,
        max_proposals,
        proposals: vector::empty(),
        winner: option::none(),
        winning_solution: option::none(),
    };

    event::emit(JobPosted {
        job_id: object::id(&job),
        poster: ctx.sender(),
        description,
        blob_id,
        bounty_amount,
        tag,
        category,
        deadline,
        selection_mode,
        max_proposals,
    });

    transfer::share_object(job);
}

/// Propose a solution to an open job.
public fun propose_solution(
    job: &mut Job,
    solution_blob_id: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(job.status == STATUS_OPEN, EJobNotOpen);
    assert!(clock.timestamp_ms() <= job.deadline, EDeadlinePassed);
    assert!(
        (job.proposals.length() as u64) < job.max_proposals,
        EMaxProposalsReached,
    );

    // Check no duplicate proposal from same address
    let sender = ctx.sender();
    let len = job.proposals.length();
    let mut i = 0;
    while (i < len) {
        assert!(job.proposals[i].proposer != sender, EAlreadyProposed);
        i = i + 1;
    };

    job.proposals.push_back(Proposal {
        proposer: sender,
        solution_blob_id,
    });

    event::emit(ProposalSubmitted {
        job_id: object::id(job),
        proposer: sender,
        solution_blob_id,
    });
}

/// Select a winner from the proposals. Poster only.
public fun select_winner(
    job: &mut Job,
    winner_address: address,
    reputation_board: &mut ReputationBoard,
    ctx: &mut TxContext,
) {
    assert!(job.status == STATUS_OPEN, EJobNotOpen);
    assert!(job.poster == ctx.sender(), ENotPoster);

    // Find the winning proposal
    let len = job.proposals.length();
    let mut found = false;
    let mut winning_blob = vector::empty<u8>();
    let mut i = 0;
    while (i < len) {
        if (job.proposals[i].proposer == winner_address) {
            found = true;
            winning_blob = job.proposals[i].solution_blob_id;
            break
        };
        i = i + 1;
    };
    assert!(found, EInvalidWinner);

    job.status = STATUS_COMPLETED;
    job.winner = option::some(winner_address);
    job.winning_solution = option::some(winning_blob);

    // Pay winner the full bounty
    let bounty_value = balance::value(&job.bounty);
    let payment = coin::from_balance(balance::split(&mut job.bounty, bounty_value), ctx);
    transfer::public_transfer(payment, winner_address);

    // Increment reputation
    if (dynamic_field::exists_(&reputation_board.id, winner_address)) {
        let score: &mut u64 = dynamic_field::borrow_mut(&mut reputation_board.id, winner_address);
        *score = *score + 1;
    } else {
        dynamic_field::add(&mut reputation_board.id, winner_address, 1u64);
    };

    event::emit(WinnerSelected {
        job_id: object::id(job),
        winner: winner_address,
        bounty_amount: bounty_value,
    });
}

/// Refund the bounty to the poster. Poster only, OPEN only.
public fun refund(
    job: &mut Job,
    ctx: &mut TxContext,
) {
    assert!(job.status == STATUS_OPEN, EJobNotOpen);
    assert!(job.poster == ctx.sender(), ENotPoster);

    job.status = STATUS_REFUNDED;

    let bounty_value = balance::value(&job.bounty);
    let payment = coin::from_balance(balance::split(&mut job.bounty, bounty_value), ctx);
    transfer::public_transfer(payment, ctx.sender());

    event::emit(JobRefunded {
        job_id: object::id(job),
        poster: ctx.sender(),
        bounty_amount: bounty_value,
    });
}

// === Test helpers ===

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
