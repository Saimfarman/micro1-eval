# Formal definitions (D1 to D5)

These definitions are the rule source for the checkers and grader. D1 to D3
follow the formulations cited in Berenson et al. (1995) and Adya (1999). D4
and D5 describe the implemented linearizability and strict-serializability
modules. Do not change definitions without recording the reason in
`docs/DECISIONS.md` and rerunning the test suite. Task prompts identify the
module and history; the expected answer is always computed by checker code.

**Basics.** A store has keys, each with an initial value. Every value written to a key in a history differs from every other value of that key, the initial one included, so a read value identifies exactly one writer (or the initial state). A transaction has an id, a list of operations in program order (`r(k)=v` or `w(k)=v`) and an outcome: committed (with a commit timestamp), aborted, or prepared (in doubt, see D3). Timed histories also give each transaction a start timestamp earlier than its end timestamp. All timestamps in one history are distinct integers, so there are no ties. The **version installed** on key k by a committed transaction is the value of its last write to k; its earlier writes to k are **intermediate**. The **version order** of a key is the initial version followed by the installed versions in order of their writers’ commit timestamps. A read **reads from** the transaction that wrote the value it returned.

**D1. Snapshot isolation (timed histories).** A history is valid iff every committed transaction T satisfies all three rules:

- **(a) Own writes:** a read of k that follows a write of k by T returns T’s most recent earlier write to k.
- **(b) Snapshot reads:** any other read of k returns the version of k installed by the committed transaction that writes k and has the greatest commit timestamp below T’s start timestamp, or the initial value if there is none.
- **(c) First committer wins:** no two committed transactions that write a common key are concurrent, where T1 and T2 are concurrent iff start(T1) < commit(T2) and start(T2) < commit(T1).

Aborted transactions are not checked, and their writes are never visible, so a committed read of such a value breaks rule (b). Naming a failed read: value written by an aborted transaction gives aborted-read; value written by a committed transaction but not as its last write to that key gives intermediate-read; anything else gives snapshot-read.

**D2. Serializability (commit-ordered histories).** The dependency graph has one node per committed transaction and, for committed Ti different from Tj, these edges:

- **ww:** Ti installs a version of k and Tj installs the next version of k.
- **wr:** Tj reads the version of k installed by Ti (not through its own write).
- **rw:** Ti reads a version of k (the initial one included) and Tj installs the next version of k after it.

A history is serializable iff all of these hold: no committed transaction reads a value written by an aborted one (anomaly G1a); no committed transaction reads an intermediate version (G1b); rule (a) of D1 holds; and the graph has no directed cycle. A cycle is named by its edge types: only ww and wr edges gives G1c; exactly one rw edge gives G-single; two or more rw edges give G2-item. Because the version order is the commit order, a cycle made only of ww edges cannot occur.

Equivalent view, used by two of the checkers: some serial order of the committed transactions reproduces every observed read and agrees with the version order. The serial order need not equal the commit order, and real-time order is not required. Requiring it would be strict serializability, a different rule that must never be mixed in.

**D3. In-doubt transactions.** A prepared transaction either committed at its stated timestamp or aborted. A **completion** fixes every in-doubt transaction as committed or aborted. A history with k in-doubt transactions is valid if all 2^k completions are valid, invalid if all are invalid, and **undetermined** otherwise. Core tasks use at most two in-doubt transactions; the extended study at most three.

**D4 (M4). Linearizability of one register.** Operations have invocation and response times (distinct integers), every write has a unique value, and the initial value is 0. A history is linearizable iff all operations can be placed in one total order that respects real time (if a responds before b is invoked, a comes first) and is legal for a register (each read returns the latest earlier write, or the initial value). A certificate of violation is a set of operations that is closed under reads-from (each read in it comes with its writer, or the initial state) and is itself not linearizable, checked exhaustively; such a set proves the whole history is not linearizable.

**D5 (M5). Strict serializability of timed transactions.** Ignore aborted
transactions and reject histories that still contain prepared transactions.
A history is valid iff there is a serial order of all committed transactions
that reproduces every observed read and respects real-time precedence: if
transaction T1 ends before T2 starts, T1 must precede T2 in the serial order.
The initial store supplies values read before any preceding write. A valid
certificate contains such a serial order; an invalid result means no such
order exists. The M5 checker implementations are in
`evalkit.domain.strict_serializability`.


**Source fidelity.** D1 to D3 follow the standard formulations in Berenson et
al. (1995) and Adya (1999) (see the source discussion in this document's
history). The project-specific M4 and M5 definitions describe the implemented
task/checker scope and should not be read as claims about every form of
linearizability or strict serializability.
