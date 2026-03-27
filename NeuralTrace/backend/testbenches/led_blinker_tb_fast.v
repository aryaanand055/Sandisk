`timescale 1ns / 1ps
module led_blinker_tb_fast;
    reg clk;
    reg reset;
    wire led;

    led_blinker #( .BLINK_PERIOD(2) ) fast_uut (
        .clk(clk),
        .reset(reset),
        .led(led)
    );

    initial begin
        clk = 0;
        forever #5 clk = ~clk;
    end

    initial begin
        reset = 1; #10 reset = 0;
        #100 $finish;
    end
endmodule
