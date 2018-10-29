import * as React from 'react';
import _ from 'lodash';
import {Map, List, Record} from 'immutable';

import {
    HashBoxesComponent,
    HashSlotsComponent,
    LineOfBoxesComponent,
    Tetris,
    SimpleCodeBlock,
    VisualizedCode,
    dummyFormat,
} from './code_blocks';

import {BreakpointFunction, HashBreakpointFunction, pyHash, DUMMY, EQ, displayStr} from './hash_impl_common';

export function formatHashClassLookdictRelated(bp) {
    switch (bp.point) {
        case 'check-not-found':
            if (bp.self.get('slots').get(bp.idx).key === null) {
                return `Slot <code>${bp.idx}</code> is empty, no more slots to check`;
            } else {
                return `We haven't hit an empty slot yet, slot <code>${bp.idx}</code> is occupied, so check it`;
            }
        case 'check-hash': {
            const slotHash = bp.self.get('slots').get(bp.idx).hashCode;
            if (slotHash.eq(bp.hashCode)) {
                return `<code>${slotHash} == ${bp.hashCode}</code>, so the slot might be occupied by the same key`;
            } else {
                return `<code>${slotHash} != ${bp.hashCode}</code>, so the slot definitely contains a different key`;
            }
        }
        case 'check-key': {
            const slotKey = bp.self.get('slots').get(bp.idx).key;
            if (slotKey == bp.key) {
                return `<code>${displayStr(slotKey)} == ${displayStr(bp.key)}</code>, so the key is found`;
            } else {
                return `<code>${displayStr(slotKey)} != ${displayStr(
                    bp.key
                )}</code>, so there is a different key with the same hash`;
            }
        }
        case 'return-idx':
            return `Return the current index, <code>${bp.idx}</code>`;
        case 'raise':
            return `Throw an exception, because no key was found`;
        /* __delitem__ */
        case 'dec-used':
            return `We're about to put a dummy placeholder in the slot, so set the counter of <code>used</code> slots to ${bp.self.get(
                'used'
            )}`;
        case 'replace-key-dummy':
            return `Replace key at <code>${bp.idx}</code> with a <code>DUMMY</code> placeholder`;
        case 'replace-value-empty':
            return `Replace value at <code>${bp.idx}</code> with <code>EMPTY</code>`;
        /* __getitem__ */
        case 'return-value': {
            const slotValue = bp.self.get('slots').get(bp.idx).value;
            return `Return <code>${displayStr(slotValue)}</code>`;
        }
        /* misc common */
        case 'start-execution-lookdict':
        case 'start-execution-getitem':
        case 'start-execution-delitem':
            return '';
    }
}

export function formatHashClassSetItemAndCreate(bp) {
    switch (bp.point) {
        case 'target-idx-none':
            return `Initialize <code>target_idx</code> - this is the index of the slot where we'll put the item`;
        case 'check-collision':
            if (bp.self.get('slots').get(bp.idx).key === null) {
                return `Slot <code>${bp.idx}</code> is empty, so don't loop`;
            } else {
                return `We haven't hit an empty slot yet, slot <code>${bp.idx}</code> is occupied`;
            }
        case 'check-dup-hash': {
            const slotHash = bp.self.get('slots').get(bp.idx).hashCode;
            if (slotHash.eq(bp.hashCode)) {
                return `<code>${slotHash} == ${
                    bp.hashCode
                }</code>, we cannot rule out the slot being occupied by the same key`;
            } else {
                return `<code>${slotHash} != ${bp.hashCode}</code>, so there is a collision with a different key`;
            }
        }
        case 'check-dup-key': {
            const slotKey = bp.self.get('slots').get(bp.idx).key;
            if (EQ(slotKey, bp.key)) {
                return `<code>${displayStr(slotKey)} == ${displayStr(
                    bp.key
                )}</code>, so the key is already present in the table`;
            } else {
                return `<code>${displayStr(slotKey)} != ${displayStr(bp.key)}</code>, so there is a collision`;
            }
        }
        case 'check-should-recycle': {
            const slotKey = bp.self.get('slots').get(bp.idx).key;
            if (bp.targetIdx !== null) {
                return `<code>target_idx == ${
                    bp.targetIdx
                }</code> - we have already found a dummy slot that we may replace`;
            } else if (slotKey !== DUMMY) {
                return `<code>target_idx is None</code> - we haven't found a dummy slot, but the current slot's key is <code>${displayStr(
                    slotKey
                )}, i.e. not dummy</code>`;
            } else {
                return `We found the first dummy slot,`;
            }
        }
        case 'set-target-idx-recycle':
            return `So save its index`;
        case 'set-target-idx-found':
            return `We will put the value in slot <code>${bp.targetIdx}</code>`;
        case 'check-dup-break':
            return 'Because the key is found, stop';
        case 'check-target-idx-is-none':
            if (bp.idx == null) {
                return `<code>target_idx is None</code>, and this means that we haven't found nor dummy slot neither existing slot`;
            } else {
                return `<code>target_idx is not None</code>, and this means we already know where to put the item`;
            }
        case 'after-probing-assign-target-idx':
            return `So we'll put the item in the current slot (<code>${bp.idx}</code>), which is empty`;
        case 'check-used-fill-increased': {
            const _idxOrTargetIdx = bp.targetIdx !== undefined ? bp.targetIdx : bp.idx;
            return (
                "If we're putting the item in an empty slot " +
                (bp.self.get('slots').get(_idxOrTargetIdx).key == null ? '(and we are)' : "(and we aren't)")
            );
        }
        case 'inc-used':
        case 'inc-used-2':
            return `Then we need to increment <code>self.used</code>, which makes it <code>${bp.self.get(
                'used'
            )}</code>`;
        case 'inc-fill':
            return `and increment fill, which makes it <code>${bp.self.get('fill')}</code>`;
        case 'check-recycle-used-increased':
            return (
                `If we're putting the item in dummy slot ` +
                (bp.self.get('slots').get(bp.targetIdx).key === DUMMY ? '(and we are)' : "(and we aren't)")
            );
        case 'assign-slot': {
            const _idxOrTargetIdx = bp.targetIdx !== undefined ? bp.targetIdx : bp.idx;
            return `Put the item in slot <code>${_idxOrTargetIdx}</code>`;
        }
        case 'check-resize': {
            const fillQ = bp.self.get('fill') * 3;
            const sizeQ = bp.self.get('slots').size * 2;
            let compStr;
            let noRunResizeStr = '';
            if (fillQ > sizeQ) {
                compStr = 'is greater than';
            } else if (fillQ === sizeQ) {
                compStr = 'is equals to';
            } else {
                compStr = 'is less than';
                noRunResizeStr = ', so no need to run <code>resize()</code>';
            }

            return (
                `<code> ${bp.self.get('fill')} * 3</code> (== <code>${fillQ}</code>) ` +
                compStr +
                ` <code>${bp.self.get('slots').size} * 2</code> (== <code>${sizeQ}</code>)` +
                noRunResizeStr
            );
        }
        case 'resize':
            return 'Do a resize';
        case 'done-no-return':
            return '';
    }
}

export function formatHashClassResize(bp) {
    switch (bp.point) {
        case 'assign-old-slots':
            return 'Copy the reference to slots (no actual copying is done)';
        case 'assign-fill':
            return `Set fill to <code>${bp.self.get('used')}</code>, since we will drop any removed "dummy" slots`;
        case 'compute-new-size':
            return `Find the smallest power of two greater than <code>${bp.self.get('used')} * 2</code>. It is <code>${
                bp.newSize
            }</code>`;
        case 'new-empty-slots':
            return `Create a new list of empty slots of size <code>${bp.self.get('slots').size}</code>`;
        case 'for-loop': {
            const {key, hashCode} = bp.oldSlots.get(bp.oldIdx);
            return `[${bp.oldIdx + 1}/${bp.oldSlots.size}] The current key to insert is <code>${
                key === null ? 'EMPTY' : displayStr(key)
            }</code> and its hash is <code>${hashCode === null ? 'EMPTY' : hashCode}</code>`;
        }
        case 'check-skip-empty-dummy': {
            const slotKey = bp.oldSlots.get(bp.oldIdx).key;
            if (slotKey === null) {
                return `The current slot is empty`;
            } else if (slotKey === DUMMY) {
                return `The current slot contains the <code>DUMMY</code> placeholder`;
            } else {
                return `The current slot is a normal slot containing an item (with key == <code>${displayStr(
                    slotKey
                )}</code>)`;
            }
        }
        case 'continue' /* FIXME not currently used */:
            return 'So skip it';
        case 'check-collision':
            if (bp.self.get('slots').get(bp.idx).key === null) {
                return `Slot <code>${bp.idx}</code> is empty, so don't loop`;
            } else {
                return `We haven't hit an empty slot yet, slot <code>${bp.idx}</code> is occupied`;
            }
        case 'assign-slot':
            return `Put the item in slot <code>${bp.idx}</code>`;
        case 'done-no-return':
        case 'start-execution':
            return '';
    }
}

export function formatHashClassInit(bp) {
    switch (bp.point) {
        case 'init-start-size':
            return `Find the smallest power of two greater than <code>${bp.pairsLength} * 2</code>. It is <code>${
                bp.startSize
            }</code>`;
        case 'init-slots':
            return `Start by creating a list of empty slots of size <code>8</code>`;
        case 'init-fill':
            return `Set <code>fill</code> to <code>0</code>, because there are no items (yet)`;
        case 'init-used':
            return `Set <code>used</code> to <code>0</code>, because there are no items (yet)`;
        case 'check-pairs':
            return `Check if there are <code>pairs</code> to insert`;
        case 'for-pairs':
            return `[${bp.oldIdx + 1}/${bp.pairs.length}] The current pair is <code>${displayStr(
                bp.oldKey
            )}</code> and <code>${displayStr(bp.oldValue)}</code>`;
        case 'run-setitem':
            return `Call self.__setitem__(<code>${displayStr(bp.oldKey)}</code>, <code>${displayStr(
                bp.oldValue
            )}</code>)`;
    }
}

export function hashClassConstructor(size = 8) {
    let slotsTemp = [];
    for (let i = 0; i < size; ++i) {
        slotsTemp.push(new Slot());
    }

    let self = Map({
        slots: new List(slotsTemp),
        used: 0,
        fill: 0,
    });

    return self;
}

export class HashClassInitEmpty extends BreakpointFunction {
    run(initStartSize = null, pairsLength = null) {
        // This is a hack
        if (pairsLength != null) {
            this.pairsLength = pairsLength;
        }

        this.self = Map({slots: []});
        let startSize;
        if (initStartSize != null) {
            startSize = initStartSize;
            this.startSize = startSize;
            this.addBP('init-start-size');
        } else {
            startSize = 8;
        }

        let slotsTemp = [];
        for (let i = 0; i < startSize; ++i) {
            slotsTemp.push(new Slot());
        }

        this.self = this.self.set('slots', new List(slotsTemp));
        this.addBP('init-slots');
        this.self = this.self.set('fill', 0);
        this.addBP('init-fill');
        this.self = this.self.set('used', 0);
        this.addBP('init-used');
        this.addBP('check-pairs');

        return this.self;
    }
}

export const Slot = Record({hashCode: null, key: null, value: null});

export function findNearestSize(minused) {
    let newSize = 8;
    while (newSize <= minused) {
        newSize *= 2;
    }

    return newSize;
}

export class HashClassSetItemBase extends HashBreakpointFunction {
    run(_self, _key, _value, useRecycling, Resize, optimalSizeQuot) {
        this.self = _self;
        this.key = _key;
        this.value = _value;

        this.hashCode = pyHash(this.key);
        this.addBP('compute-hash');

        this.computeIdxAndSave(this.hashCode, this.self.get('slots').size);
        if (useRecycling) {
            this.targetIdx = null;
            this.addBP('target-idx-none');
        }

        while (true) {
            this.addBP('check-collision');
            if (this.self.get('slots').get(this.idx).key === null) {
                break;
            }

            this.addBP('check-dup-hash');
            if (
                this.self
                    .get('slots')
                    .get(this.idx)
                    .hashCode.eq(this.hashCode)
            ) {
                this.addBP('check-dup-key');
                if (EQ(this.self.get('slots').get(this.idx).key, this.key)) {
                    if (useRecycling) {
                        this.targetIdx = this.idx;
                        this.addBP('set-target-idx-found');
                    }
                    this.addBP('check-dup-break');
                    break;
                }
            }

            if (useRecycling) {
                this.addBP('check-should-recycle');
                if (this.targetIdx === null && this.self.get('slots').get(this.idx).key === DUMMY) {
                    this.targetIdx = this.idx;
                    this.addBP('set-target-idx-recycle');
                }
            }

            this.nextIdxAndSave();
        }

        if (useRecycling) {
            this.addBP('check-target-idx-is-none');
            if (this.targetIdx === null) {
                this.targetIdx = this.idx;
                this.addBP('after-probing-assign-target-idx');
            }
        }

        this.addBP('check-used-fill-increased');
        let idx = useRecycling ? this.targetIdx : this.idx;
        if (this.self.get('slots').get(idx).key === null) {
            this.self = this.self.set('used', this.self.get('used') + 1);
            this.addBP('inc-used');

            this.self = this.self.set('fill', this.self.get('fill') + 1);
            this.addBP('inc-fill');
        } else {
            if (useRecycling) {
                this.addBP('check-recycle-used-increased');
                if (this.self.get('slots').get(idx).key === DUMMY) {
                    this.self = this.self.set('used', this.self.get('used') + 1);
                    this.addBP('inc-used-2');
                }
            }
        }

        this.self = this.self.setIn(
            ['slots', idx],
            new Slot({hashCode: this.hashCode, key: this.key, value: this.value})
        );

        this.addBP('assign-slot');
        this.addBP('check-resize');
        if (this.self.get('fill') * 3 >= this.self.get('slots').size * 2) {
            let hashClassResize = new Resize();
            let _oldSelf = this.self;
            this.self = hashClassResize.run(this.self, optimalSizeQuot);

            this._resize = {
                oldSelf: _oldSelf,
                self: this.self,
                breakpoints: hashClassResize.getBreakpoints(),
            };

            this.addBP('resize');
        }
        this.addBP('done-no-return');
        return this.self;
    }

    getResize() {
        return this._resize !== undefined ? this._resize : null;
    }
}

export class HashClassLookdictBase extends HashBreakpointFunction {
    run(_self, _key) {
        this.self = _self;
        this.key = _key;

        this.addBP('start-execution-lookdict');
        this.hashCode = pyHash(this.key);
        this.addBP('compute-hash');
        this.computeIdxAndSave(this.hashCode, this.self.get('slots').size);

        while (true) {
            this.addBP('check-not-found');
            if (this.self.get('slots').get(this.idx).key === null) {
                break;
            }

            this.addBP('check-hash');
            if (
                this.self
                    .get('slots')
                    .get(this.idx)
                    .hashCode.eq(this.hashCode)
            ) {
                this.addBP('check-key');
                if (EQ(this.self.get('slots').get(this.idx).key, this.key)) {
                    this.addBP('return-idx');
                    return this.idx;
                }
            }

            this.nextIdxAndSave();
        }

        this.addBP('raise');
        return null;
    }
}

export class HashClassGetItem extends HashBreakpointFunction {
    run(_self, _key, Lookdict) {
        this.self = _self;
        this.key = _key;
        this.addBP('start-execution-getitem');

        let hcld = new Lookdict();
        this.idx = hcld.run(this.self, this.key);
        this._breakpoints = [...this._breakpoints, ...hcld.getBreakpoints()];
        if (this.idx !== null) {
            // did not throw exception
            this.addBP('return-value');
            return this.self.get('slots').get(this.idx).value;
        }
    }
}

export class HashClassDelItem extends HashBreakpointFunction {
    run(_self, _key, Lookdict) {
        this.self = _self;
        this.key = _key;
        this.addBP('start-execution-delitem');

        let hcld = new Lookdict();
        this.idx = hcld.run(this.self, this.key);
        this._breakpoints = [...this._breakpoints, ...hcld.getBreakpoints()];
        if (this.idx !== null) {
            // did not throw exception
            this.self = this.self.set('used', this.self.get('used') - 1);
            this.addBP('dec-used');
            this.self = this.self.setIn(['slots', this.idx, 'key'], DUMMY);
            this.addBP('replace-key-dummy');
            this.self = this.self.setIn(['slots', this.idx, 'value'], null);
            this.addBP('replace-value-empty');
        }
        return this.self;
    }
}

export class HashClassInsertAll extends HashBreakpointFunction {
    constructor() {
        super();

        this._resizes = [];
    }

    run(_self, _pairs, useRecycling, SetItem, Resize, optimalSizeQuot) {
        this.self = _self;
        this.pairs = _pairs;
        for ([this.oldIdx, [this.oldKey, this.oldValue]] of this.pairs.entries()) {
            this.addBP('for-pairs');
            this.addBP('run-setitem');
            let hcsi = new SetItem();
            hcsi.setExtraBpContext({
                oldIdx: this.oldIdx,
                pairs: this.pairs,
            });
            this.self = hcsi.run(this.self, this.oldKey, this.oldValue, useRecycling, Resize, optimalSizeQuot);
            if (hcsi.getResize()) {
                this._resizes.push(hcsi.getResize());
            }
            this._breakpoints = [...this._breakpoints, ...hcsi.getBreakpoints()];
        }
        return this.self;
    }

    getResizes() {
        return this._resizes;
    }
}

export function HashClassNormalStateVisualization(props) {
    return (
        <Tetris
            lines={[
                [
                    HashSlotsComponent,
                    [
                        null,
                        'self.slots',
                        'idx',
                        'targetIdx',
                        {labels: ['slots/hashCode', 'slots/key', 'slots/value'], labelWidth: 140},
                    ],
                ],
            ]}
            {...props}
        />
    );
}

export function HashClassInsertAllVisualization(props) {
    return (
        <Tetris
            lines={[
                [
                    LineOfBoxesComponent,
                    [
                        null,
                        'pairs',
                        'oldIdx',
                        undefined,
                        {labels: ['pairs[*][0]', 'pairs[*][1]'], labelWidth: 140, linesCount: 2},
                    ],
                ],
                [
                    HashSlotsComponent,
                    [
                        null,
                        'self.slots',
                        'idx',
                        undefined,
                        {labels: ['slots/hashCode', 'slots/key', 'slots/value'], labelWidth: 140},
                    ],
                ],
            ]}
            {...props}
        />
    );
}

export function HashClassResizeVisualization(props) {
    return (
        <Tetris
            lines={[
                [
                    HashSlotsComponent,
                    [
                        null,
                        'oldSlots',
                        'oldIdx',
                        undefined,
                        {labels: ['oldSlots/hashCode', 'oldSlots/key', 'oldSlots/value'], labelWidth: 167},
                    ],
                ],
                [
                    HashSlotsComponent,
                    [
                        null,
                        'self.slots',
                        'idx',
                        undefined,
                        {labels: ['slots/hashCode', 'slots/key', 'slots/value'], labelWidth: 167},
                    ],
                ],
            ]}
            {...props}
        />
    );
}

export class HashClassResizeBase extends HashBreakpointFunction {
    run(_self, optimalSizeQuot) {
        this.self = _self;

        this.oldSlots = new List();
        this.addBP('start-execution');
        this.oldSlots = this.self.get('slots');
        this.addBP('assign-old-slots');
        this.newSize = findNearestSize(this.self.get('used') * optimalSizeQuot);
        this.addBP('compute-new-size');

        let slotsTemp = [];

        for (let i = 0; i < this.newSize; ++i) {
            slotsTemp.push(new Slot());
        }
        this.self = this.self.set('slots', new List(slotsTemp));
        this.addBP('new-empty-slots');

        this.self = this.self.set('fill', this.self.get('used'));
        this.addBP('assign-fill');

        for ([this.oldIdx, this.slot] of this.oldSlots.entries()) {
            /* For consistency with other functions, add these names */
            this.hashCode = this.slot.hashCode;
            this.key = this.slot.key;
            this.value = this.slot.value;

            this.addBP('for-loop');
            this.addBP('check-skip-empty-dummy');
            if (this.slot.key === null || this.slot.key === DUMMY) {
                continue;
            }
            this.computeIdxAndSave(this.slot.hashCode, this.self.get('slots').size);

            while (true) {
                this.addBP('check-collision');
                if (this.self.get('slots').get(this.idx).key === null) {
                    break;
                }

                this.nextIdxAndSave();
            }

            this.self = this.self.setIn(['slots', this.idx], this.slot);
            this.addBP('assign-slot');
        }
        this.addBP('done-no-return');

        return this.self;
    }
}
